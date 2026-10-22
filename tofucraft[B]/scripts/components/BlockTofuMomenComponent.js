var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { blockComponent } from "../lib/CustomComponentAPI";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";
/**
 * Momen (Cotton) Tofu Block Component
 *
 * Based on Java TofuCraft BlockTofu(momen).setDrain(3):
 * pressed under weight (a rock/metal block above and a firm block below), it drains in 7 steps (1/3 per random
 * tick each), then turns into ishi (solid) tofu with a 1/6 chance per tick.
 *
 * The transformation chain:
 * momen_tofu_block + weight -> ishi_tofu_block + weight -> metal_tofu_block
 */
let BlockTofuMomenComponent = class BlockTofuMomenComponent {
    onRandomTick(args) {
        const { block } = args;
        if (TofuBlockUtil.isUnderWeight(block)) {
            TofuBlockUtil.drainOneStep(block, 3, "tofucraft:ishi_tofu_block");
        }
    }
};
BlockTofuMomenComponent = __decorate([
    blockComponent("tofucraft:momen_tofu_block")
], BlockTofuMomenComponent);
export { BlockTofuMomenComponent };
