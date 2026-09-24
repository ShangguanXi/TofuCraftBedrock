import {
    BlockCustomComponent,
    BlockComponentRandomTickEvent
} from "@minecraft/server";
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
@blockComponent("tofucraft:momen_tofu_block")
export class BlockTofuMomenComponent implements BlockCustomComponent {
    onRandomTick(args: BlockComponentRandomTickEvent): void {
        const { block } = args;
        if (TofuBlockUtil.isUnderWeight(block) && Math.random() < DRAIN_CHANCE) {
            block.setType("tofucraft:ishi_tofu_block");
        }
    }
}
