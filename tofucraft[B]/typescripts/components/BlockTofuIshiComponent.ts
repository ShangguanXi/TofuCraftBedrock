import {
    BlockCustomComponent,
    BlockComponentRandomTickEvent
} from "@minecraft/server";
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
@blockComponent("tofucraft:ishi_tofu_block")
export class BlockTofuIshiComponent implements BlockCustomComponent {
    onRandomTick(args: BlockComponentRandomTickEvent): void {
        const { block } = args;
        if (TofuBlockUtil.isUnderWeight(block)) {
            TofuBlockUtil.drainOneStep(block, 8, "tofucraft:metal_tofu_block");
        }
    }
}
