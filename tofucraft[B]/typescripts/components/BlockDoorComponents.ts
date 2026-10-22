import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockComponentRedstoneUpdateEvent,
    BlockCustomComponent,
    ItemStack,
    Player,
    system
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { Cardinal, Cardinals } from "../lib/Cardinals";
import { HeldItem } from "../lib/HeldItem";
import { OpenSounds, Openable } from "../lib/Openable";

const HINGE = "tofucraft:hinge";
const WOODEN_DOOR: OpenSounds = { open: "open.wooden_door", close: "close.wooden_door" };
const IRON_DOOR: OpenSounds = { open: "open.iron_door", close: "close.iron_door" };

/**
 * Tofu doors (Java BlockTofuDoor / ItemDoor): two-part blocks ("minecraft:multi_block"), placed facing the way the
 * player looks, with the hinge chosen like Java. The door item drops once, from the script, whichever part breaks.
 */
export class TofuDoor {
    /**
     * Java ItemDoor.placeDoorBlock: hinge on the right (1) when a door of the same kind stands on the left only, or
     * when the right side has more solid blocks (lower and upper half) than the left.
     */
    public static hingeFor(block: Block, facing: Cardinal, doorType: string): number {
        const left = Cardinals.neighbour(block, Cardinals.leftOf(facing));
        const right = Cardinals.neighbour(block, Cardinals.rightOf(facing));
        const column = (base: Block | undefined) => [base, base?.above()];
        const solid = (b: Block | undefined) => (b && !b.isAir && !b.isLiquid && b.isSolid ? 1 : 0);
        const count = (base: Block | undefined) => column(base).reduce((n, b) => n + solid(b), 0);
        const hasDoor = (base: Block | undefined) => column(base).some(b => b?.typeId === doorType);
        const doorLeft = hasDoor(left);
        const doorRight = hasDoor(right);
        return (doorLeft && !doorRight) || count(right) > count(left) ? 1 : 0;
    }

    public static beforePlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
        const { block, dimension } = event;
        // Java BlockDoor.canPlaceBlockAt: the door stands on a solid block.
        const below = block.below();
        if (!below || !below.isSolid) {
            event.cancel = true;
            return;
        }
        const doorType = event.permutationToPlace.type.id;
        const facing = Cardinals.of(event.permutationToPlace.getState("minecraft:cardinal_direction")) ?? "north";
        const hinge = this.hingeFor(block, facing, doorType);
        event.permutationToPlace = event.permutationToPlace.withState(HINGE, hinge);
        // Each part keeps its own custom states: make sure the upper part got the hinge too.
        const location = block.location;
        system.run(() => {
            const placed = dimension.getBlock(location);
            if (placed?.typeId !== doorType) return;
            for (const part of placed.getParts() ?? [placed]) {
                if (part.permutation.getState(HINGE) !== hinge) part.setPermutation(part.permutation.withState(HINGE, hinge));
            }
        });
    }

    /** One door item per door; nothing for creative players. */
    public static drop({ block, brokenBlockPermutation, entitySource }: BlockComponentBlockBreakEvent): void {
        if (entitySource instanceof Player && HeldItem.isCreative(entitySource)) return;
        block.dimension.spawnItem(new ItemStack(brokenBlockPermutation.type.id), block.center());
    }
}

/** Doors that open by hand and by redstone. */
@blockComponent("tofucraft:door")
export class BlockDoorComponent implements BlockCustomComponent {
    beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
        TofuDoor.beforePlace(event);
    }

    onPlayerInteract({ block }: BlockComponentPlayerInteractEvent): void {
        Openable.setOpen(block, !Openable.isOpen(block), WOODEN_DOOR);
    }

    onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        Openable.onRedstoneUpdate(event, WOODEN_DOOR);
    }

    onBreak(event: BlockComponentBlockBreakEvent): void {
        TofuDoor.drop(event);
    }
}

/** The metal tofu door is Material.iron in Java: players cannot open it, only redstone. */
@blockComponent("tofucraft:redstone_door")
export class BlockRedstoneDoorComponent implements BlockCustomComponent {
    beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
        TofuDoor.beforePlace(event);
    }

    onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        Openable.onRedstoneUpdate(event, IRON_DOOR);
    }

    onBreak(event: BlockComponentBlockBreakEvent): void {
        TofuDoor.drop(event);
    }
}
