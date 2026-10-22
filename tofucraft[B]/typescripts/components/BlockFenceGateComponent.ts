import {
    BlockComponentPlayerInteractEvent,
    BlockComponentRedstoneUpdateEvent,
    BlockCustomComponent
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { Cardinals } from "../lib/Cardinals";
import { OPEN, OpenSounds, Openable } from "../lib/Openable";

const CARDINAL = "minecraft:cardinal_direction";
const FENCE_GATE: OpenSounds = { open: "open.fence_gate", close: "close.fence_gate" };

/**
 * Tofu fence gates (Java BlockFenceGate, Material.wood for every tofu, so the metal one opens by hand too).
 * Opening turns the gate around when the player stands on the side it would swing into, so it always swings away.
 */
@blockComponent("tofucraft:fence_gate")
export class BlockFenceGateComponent implements BlockCustomComponent {
    onPlayerInteract({ block, player }: BlockComponentPlayerInteractEvent): void {
        const permutation = block.permutation;
        if (permutation.getState(OPEN) === 1) {
            Openable.setOpen(block, false, FENCE_GATE);
            return;
        }
        const facing = player ? Cardinals.fromYaw(player.getRotation().y) : undefined;
        if (facing && Cardinals.of(permutation.getState(CARDINAL)) === Cardinals.opposite(facing)) {
            block.setPermutation(permutation.withState(CARDINAL, facing));
        }
        Openable.setOpen(block, true, FENCE_GATE);
    }

    onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        Openable.onRedstoneUpdate(event, FENCE_GATE);
    }
}
