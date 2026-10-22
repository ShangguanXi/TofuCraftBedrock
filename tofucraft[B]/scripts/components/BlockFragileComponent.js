var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Player, world } from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";
/**
 * Kinu tofu construction blocks (Java TofuBlockUtils.onFallenUponFragileTofu): they break and drop themselves when an
 * entity falls on them from more than 0.5 blocks (mobs only with mobGriefing on). Needs "minecraft:entity_fall_on".
 * Stairs and double slabs also break when a stone or metal block sits on them.
 */
let BlockFragileComponent = class BlockFragileComponent {
    onEntityFallOn({ block, entity, fallDistance }) {
        if (!entity || fallDistance <= 0.5)
            return;
        if (!(entity instanceof Player) && !world.gameRules.mobGriefing)
            return;
        TofuBlockUtil.breakNaturally(block);
    }
    onRandomTick({ block }, { params }) {
        if (!params?.weight)
            return;
        // Java only weighs down double kinu slabs.
        if (block.permutation.getState("tofucraft:double") === 0)
            return;
        try {
            const above = block.above();
            if (above && TofuBlockUtil.isHeavy(above))
                TofuBlockUtil.breakNaturally(block);
        }
        catch {
            // The block above is outside the world or in an unloaded chunk.
        }
    }
};
BlockFragileComponent = __decorate([
    blockComponent("tofucraft:fragile")
], BlockFragileComponent);
export { BlockFragileComponent };
