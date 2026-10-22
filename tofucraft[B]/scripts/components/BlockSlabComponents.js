var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { blockComponent } from "../lib/CustomComponentAPI";
/**
 * Grilled tofu slab (Java BlockTofuStepFaces.determineOrientation): the grilled face goes on top when the slab is
 * placed at or below the player's feet, underneath when it is placed higher ("tofucraft:grilled_face" 0 / 1).
 */
let BlockGrilledSlabComponent = class BlockGrilledSlabComponent {
    beforeOnPlayerPlace(event) {
        const { player, block } = event;
        if (!player)
            return;
        const face = player.location.y + 0.2 > block.location.y ? 0 : 1;
        event.permutationToPlace = event.permutationToPlace.withState("tofucraft:grilled_face", face);
    }
};
BlockGrilledSlabComponent = __decorate([
    blockComponent("tofucraft:grilled_slab")
], BlockGrilledSlabComponent);
export { BlockGrilledSlabComponent };
