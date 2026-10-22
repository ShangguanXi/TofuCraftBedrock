var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ItemStack, Player, system } from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { Cardinals } from "../lib/Cardinals";
import { HeldItem } from "../lib/HeldItem";
import { Openable } from "../lib/Openable";
const HINGE = "tofucraft:hinge";
const WOODEN_DOOR = { open: "open.wooden_door", close: "close.wooden_door" };
const IRON_DOOR = { open: "open.iron_door", close: "close.iron_door" };
/**
 * Tofu doors (Java BlockTofuDoor / ItemDoor): two-part blocks ("minecraft:multi_block"), placed facing the way the
 * player looks, with the hinge chosen like Java. The door item drops once, from the script, whichever part breaks.
 */
export class TofuDoor {
    /**
     * Java ItemDoor.placeDoorBlock: hinge on the right (1) when a door of the same kind stands on the left only, or
     * when the right side has more solid blocks (lower and upper half) than the left.
     */
    static hingeFor(block, facing, doorType) {
        const left = Cardinals.neighbour(block, Cardinals.leftOf(facing));
        const right = Cardinals.neighbour(block, Cardinals.rightOf(facing));
        const column = (base) => [base, base?.above()];
        const solid = (b) => (b && !b.isAir && !b.isLiquid && b.isSolid ? 1 : 0);
        const count = (base) => column(base).reduce((n, b) => n + solid(b), 0);
        const hasDoor = (base) => column(base).some(b => b?.typeId === doorType);
        const doorLeft = hasDoor(left);
        const doorRight = hasDoor(right);
        return (doorLeft && !doorRight) || count(right) > count(left) ? 1 : 0;
    }
    static beforePlace(event) {
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
            if (placed?.typeId !== doorType)
                return;
            for (const part of placed.getParts() ?? [placed]) {
                if (part.permutation.getState(HINGE) !== hinge)
                    part.setPermutation(part.permutation.withState(HINGE, hinge));
            }
        });
    }
    /** One door item per door; nothing for creative players. */
    static drop({ block, brokenBlockPermutation, entitySource }) {
        if (entitySource instanceof Player && HeldItem.isCreative(entitySource))
            return;
        block.dimension.spawnItem(new ItemStack(brokenBlockPermutation.type.id), block.center());
    }
}
/** Doors that open by hand and by redstone. */
let BlockDoorComponent = class BlockDoorComponent {
    beforeOnPlayerPlace(event) {
        TofuDoor.beforePlace(event);
    }
    onPlayerInteract({ block }) {
        Openable.setOpen(block, !Openable.isOpen(block), WOODEN_DOOR);
    }
    onRedstoneUpdate(event) {
        Openable.onRedstoneUpdate(event, WOODEN_DOOR);
    }
    onBreak(event) {
        TofuDoor.drop(event);
    }
};
BlockDoorComponent = __decorate([
    blockComponent("tofucraft:door")
], BlockDoorComponent);
export { BlockDoorComponent };
/** The metal tofu door is Material.iron in Java: players cannot open it, only redstone. */
let BlockRedstoneDoorComponent = class BlockRedstoneDoorComponent {
    beforeOnPlayerPlace(event) {
        TofuDoor.beforePlace(event);
    }
    onRedstoneUpdate(event) {
        Openable.onRedstoneUpdate(event, IRON_DOOR);
    }
    onBreak(event) {
        TofuDoor.drop(event);
    }
};
BlockRedstoneDoorComponent = __decorate([
    blockComponent("tofucraft:redstone_door")
], BlockRedstoneDoorComponent);
export { BlockRedstoneDoorComponent };
