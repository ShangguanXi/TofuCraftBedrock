import {
    BlockComponentPlayerInteractEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockComponentRedstoneUpdateEvent,
    BlockCustomComponent
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { Cardinals } from "../lib/Cardinals";
import { OpenSounds, Openable } from "../lib/Openable";

const WOODEN_TRAPDOOR: OpenSounds = { open: "open.wooden_trapdoor", close: "close.wooden_trapdoor" };
const IRON_TRAPDOOR: OpenSounds = { open: "open.iron_trapdoor", close: "close.iron_trapdoor" };

/**
 * The hinge is on the "minecraft:cardinal_direction" side. Placed against the side of a block, the trapdoor hangs from
 * that block (Java 1.7.10 trapdoors only went on walls); placed on a top or bottom face it takes the direction the
 * player looks, like vanilla Bedrock, and opens away from the player.
 */
function hangFromClickedBlock(event: BlockComponentPlayerPlaceBeforeEvent): void {
    const side = Cardinals.fromDirection(event.face);
    if (side) event.permutationToPlace = event.permutationToPlace.withState("minecraft:cardinal_direction", Cardinals.opposite(side));
}

/** Trapdoors that open by hand and by redstone. */
@blockComponent("tofucraft:trapdoor")
export class BlockTrapdoorComponent implements BlockCustomComponent {
    beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
        hangFromClickedBlock(event);
    }

    onPlayerInteract({ block }: BlockComponentPlayerInteractEvent): void {
        Openable.setOpen(block, !Openable.isOpen(block), WOODEN_TRAPDOOR);
    }

    onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        Openable.onRedstoneUpdate(event, WOODEN_TRAPDOOR);
    }
}

/** The metal tofu trapdoor is Material.iron in Java: redstone only. */
@blockComponent("tofucraft:redstone_trapdoor")
export class BlockRedstoneTrapdoorComponent implements BlockCustomComponent {
    beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
        hangFromClickedBlock(event);
    }

    onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        Openable.onRedstoneUpdate(event, IRON_TRAPDOOR);
    }
}
