import {
    BlockCustomComponent,
    BlockComponentRandomTickEvent
} from "@minecraft/server";
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
@blockComponent("tofucraft:momen_tofu_block")
export class BlockTofuMomenComponent implements BlockCustomComponent {
    onRandomTick(args: BlockComponentRandomTickEvent): void {
        const { block } = args;
        if (TofuBlockUtil.isUnderWeight(block)) {
            TofuBlockUtil.drainOneStep(block, 3, "tofucraft:ishi_tofu_block");
        }
    }
}
