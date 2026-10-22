import { BlockComponentPlayerPlaceBeforeEvent, BlockCustomComponent } from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";

/**
 * Grilled tofu slab (Java BlockTofuStepFaces.determineOrientation): the grilled face goes on top when the slab is
 * placed at or below the player's feet, underneath when it is placed higher ("tofucraft:grilled_face" 0 / 1).
 */
@blockComponent("tofucraft:grilled_slab")
export class BlockGrilledSlabComponent implements BlockCustomComponent {
    beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
        const { player, block } = event;
        if (!player) return;
        const face = player.location.y + 0.2 > block.location.y ? 0 : 1;
        event.permutationToPlace = event.permutationToPlace.withState("tofucraft:grilled_face", face);
    }
}
