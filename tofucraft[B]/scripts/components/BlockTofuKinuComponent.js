var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Player, world } from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";
const FREEZE_STEP = "tofucraft:freeze_step";
/**
 * Kinu Tofu Block Component
 *
 * Based on Java TofuCraft BlockTofu(kinu).setFragile().setFreeze(5):
 * 1. Fragile - crushed when pressed under weight, or when an entity falls on it from more than 0.5 blocks
 *    (mobs only with mobGriefing on). Each of its 4 drops survives with a 40% chance.
 * 2. Freezable - near the surface of cold places with air above, it freezes in 7 steps (1/5 per random tick each)
 *    and turns into dried (koya) tofu on the next valid tick.
 */
let BlockTofuKinuComponent = class BlockTofuKinuComponent {
    /**
     * Needs "minecraft:entity_fall_on" on the block for the event to fire.
     */
    onEntityFallOn(args) {
        const { block, entity, fallDistance } = args;
        if (!entity || fallDistance <= 0.5)
            return;
        if (!(entity instanceof Player) && !world.gameRules.mobGriefing)
            return;
        TofuBlockUtil.crushKinu(block);
    }
    onRandomTick(args) {
        const { block } = args;
        if (TofuBlockUtil.isUnderWeight(block)) {
            TofuBlockUtil.crushKinu(block);
            return;
        }
        if (!TofuBlockUtil.canFreeze(block))
            return;
        const step = block.permutation.getState(FREEZE_STEP) ?? 0;
        if (step < 7) {
            if (Math.random() < 1 / 5)
                block.setPermutation(block.permutation.withState(FREEZE_STEP, step + 1));
        }
        else {
            block.setType("tofucraft:dried_tofu_block");
        }
    }
};
BlockTofuKinuComponent = __decorate([
    blockComponent("tofucraft:kinu_tofu_block")
], BlockTofuKinuComponent);
export { BlockTofuKinuComponent };
