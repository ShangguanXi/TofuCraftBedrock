var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { blockComponent } from "../lib/CustomComponentAPI";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";
// Java drain rate 3: 7 steps at 1/3 each, then 1/6 per tick to convert = 27 random ticks under weight on average.
// The per-step state arrives with the pressing chain (M1).
const DRAIN_CHANCE = 1 / 27;
/**
 * Momen (Cotton) Tofu Block Component
 *
 * Based on Java TofuCraft BlockTofu(momen).setDrain(3):
 * pressed under weight (a rock/metal block above and a firm block below), it drains into ishi (solid) tofu.
 *
 * The transformation chain:
 * momen_tofu_block + weight -> ishi_tofu_block + weight -> metal_tofu_block
 */
let BlockTofuMomenComponent = class BlockTofuMomenComponent {
    onRandomTick(args) {
        const { block } = args;
        if (TofuBlockUtil.isUnderWeight(block) && Math.random() < DRAIN_CHANCE) {
            block.setType("tofucraft:ishi_tofu_block");
        }
    }
};
BlockTofuMomenComponent = __decorate([
    blockComponent("tofucraft:momen_tofu_block")
], BlockTofuMomenComponent);
export { BlockTofuMomenComponent };
