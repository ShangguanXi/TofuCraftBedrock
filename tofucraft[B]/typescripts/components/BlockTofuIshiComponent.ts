import {
    BlockCustomComponent,
    BlockComponentRandomTickEvent
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";

// Java drain rate 8: 7 steps at 1/8 each, then 1/16 per tick to convert = 72 random ticks under weight on average.
// The per-step state arrives with the pressing chain (M1).
const DRAIN_CHANCE = 1 / 72;

/**
 * Ishi (Stone) Tofu Block Component
 *
 * Based on Java TofuCraft BlockTofuIshi.setDrain(8):
 * like momen tofu it only hardens while pressed under weight, turning into metal tofu.
 *
 * The transformation chain:
 * momen_tofu_block + weight -> ishi_tofu_block + weight -> metal_tofu_block
 */
@blockComponent("tofucraft:ishi_tofu_block")
export class BlockTofuIshiComponent implements BlockCustomComponent {
    onRandomTick(args: BlockComponentRandomTickEvent): void {
        const { block } = args;
        if (TofuBlockUtil.isUnderWeight(block) && Math.random() < DRAIN_CHANCE) {
            block.setType("tofucraft:metal_tofu_block");
        }
    }
}
