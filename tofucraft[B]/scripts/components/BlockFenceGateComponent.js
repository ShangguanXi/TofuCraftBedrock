var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { blockComponent } from "../lib/CustomComponentAPI";
import { Cardinals } from "../lib/Cardinals";
import { OPEN, Openable } from "../lib/Openable";
const CARDINAL = "minecraft:cardinal_direction";
const FENCE_GATE = { open: "open.fence_gate", close: "close.fence_gate" };
/**
 * Tofu fence gates (Java BlockFenceGate, Material.wood for every tofu, so the metal one opens by hand too).
 * Opening turns the gate around when the player stands on the side it would swing into, so it always swings away.
 */
let BlockFenceGateComponent = class BlockFenceGateComponent {
    onPlayerInteract({ block, player }) {
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
    onRedstoneUpdate(event) {
        Openable.onRedstoneUpdate(event, FENCE_GATE);
    }
};
BlockFenceGateComponent = __decorate([
    blockComponent("tofucraft:fence_gate")
], BlockFenceGateComponent);
export { BlockFenceGateComponent };
