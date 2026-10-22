import {
    BlockComponentEntityFallOnEvent,
    BlockComponentRandomTickEvent,
    BlockCustomComponent,
    CustomComponentParameters,
    Player,
    world
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";

interface FragileParams {
    /** Also breaks under a heavy block (Java: kinu stairs and double slabs). */
    weight?: boolean;
}

/**
 * Kinu tofu construction blocks (Java TofuBlockUtils.onFallenUponFragileTofu): they break and drop themselves when an
 * entity falls on them from more than 0.5 blocks (mobs only with mobGriefing on). Needs "minecraft:entity_fall_on".
 * Stairs and double slabs also break when a stone or metal block sits on them.
 */
@blockComponent("tofucraft:fragile")
export class BlockFragileComponent implements BlockCustomComponent {
    onEntityFallOn({ block, entity, fallDistance }: BlockComponentEntityFallOnEvent): void {
        if (!entity || fallDistance <= 0.5) return;
        if (!(entity instanceof Player) && !world.gameRules.mobGriefing) return;
        TofuBlockUtil.breakNaturally(block);
    }

    onRandomTick({ block }: BlockComponentRandomTickEvent, { params }: CustomComponentParameters): void {
        if (!(params as FragileParams | undefined)?.weight) return;
        // Java only weighs down double kinu slabs.
        if (block.permutation.getState("tofucraft:double") === 0) return;
        try {
            const above = block.above();
            if (above && TofuBlockUtil.isHeavy(above)) TofuBlockUtil.breakNaturally(block);
        } catch {
            // The block above is outside the world or in an unloaded chunk.
        }
    }
}
