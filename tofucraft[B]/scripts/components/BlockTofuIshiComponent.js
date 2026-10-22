var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { blockComponent } from "../lib/CustomComponentAPI";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";
/**
 * Ishi (Stone) Tofu Block Component
 *
 * Based on Java TofuCraft BlockTofuIshi.setDrain(8):
 * like momen tofu it only hardens while pressed under weight: 7 steps at 1/8 per random tick each, then metal tofu
 * with a 1/16 chance per tick.
 *
 * The transformation chain:
 * momen_tofu_block + weight -> ishi_tofu_block + weight -> metal_tofu_block
 */
let BlockTofuIshiComponent = class BlockTofuIshiComponent {
    onRandomTick(args) {
        const { block } = args;
        if (TofuBlockUtil.isUnderWeight(block)) {
            TofuBlockUtil.drainOneStep(block, 8, "tofucraft:metal_tofu_block");
        }
    }
};
BlockTofuIshiComponent = __decorate([
    blockComponent("tofucraft:ishi_tofu_block")
], BlockTofuIshiComponent);
export { BlockTofuIshiComponent };
