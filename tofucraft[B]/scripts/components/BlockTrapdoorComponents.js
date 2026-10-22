var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { blockComponent } from "../lib/CustomComponentAPI";
import { Cardinals } from "../lib/Cardinals";
import { Openable } from "../lib/Openable";
const WOODEN_TRAPDOOR = { open: "open.wooden_trapdoor", close: "close.wooden_trapdoor" };
const IRON_TRAPDOOR = { open: "open.iron_trapdoor", close: "close.iron_trapdoor" };
/**
 * The hinge is on the "minecraft:cardinal_direction" side. Placed against the side of a block, the trapdoor hangs from
 * that block (Java 1.7.10 trapdoors only went on walls); placed on a top or bottom face it takes the direction the
 * player looks, like vanilla Bedrock, and opens away from the player.
 */
function hangFromClickedBlock(event) {
    const side = Cardinals.fromDirection(event.face);
    if (side)
        event.permutationToPlace = event.permutationToPlace.withState("minecraft:cardinal_direction", Cardinals.opposite(side));
}
/** Trapdoors that open by hand and by redstone. */
let BlockTrapdoorComponent = class BlockTrapdoorComponent {
    beforeOnPlayerPlace(event) {
        hangFromClickedBlock(event);
    }
    onPlayerInteract({ block }) {
        Openable.setOpen(block, !Openable.isOpen(block), WOODEN_TRAPDOOR);
    }
    onRedstoneUpdate(event) {
        Openable.onRedstoneUpdate(event, WOODEN_TRAPDOOR);
    }
};
BlockTrapdoorComponent = __decorate([
    blockComponent("tofucraft:trapdoor")
], BlockTrapdoorComponent);
export { BlockTrapdoorComponent };
/** The metal tofu trapdoor is Material.iron in Java: redstone only. */
let BlockRedstoneTrapdoorComponent = class BlockRedstoneTrapdoorComponent {
    beforeOnPlayerPlace(event) {
        hangFromClickedBlock(event);
    }
    onRedstoneUpdate(event) {
        Openable.onRedstoneUpdate(event, IRON_TRAPDOOR);
    }
};
BlockRedstoneTrapdoorComponent = __decorate([
    blockComponent("tofucraft:redstone_trapdoor")
], BlockRedstoneTrapdoorComponent);
export { BlockRedstoneTrapdoorComponent };
