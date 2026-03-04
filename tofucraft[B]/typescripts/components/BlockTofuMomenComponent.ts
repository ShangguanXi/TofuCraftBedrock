import {
    BlockCustomComponent,
    BlockComponentRandomTickEvent,
    BlockComponentStepOnEvent
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";

/**
 * Momen (Cotton) Tofu Block Component
 *
 * Based on Java TofuCraft logic:
 * 1. When pressed by stone-like blocks above, it transforms into ishi_tofu_block (stone tofu)
 * 2. This is the base form of tofu that can be further processed
 *
 * The transformation requires:
 * - A stone-like block directly above (simulating weight/pressure)
 * - Random tick with appropriate probability
 */
@blockComponent("tofucraft:momen_tofu_block")
export class BlockTofuMomenComponent implements BlockCustomComponent {
    /**
     * Random tick - handles the transformation from momen to ishi tofu
     * When a stone-like block is above, the tofu gets pressed and hardens
     */
    onRandomTick(args: BlockComponentRandomTickEvent): void {
        const { block } = args;
        const dimension = block.dimension;
        const location = block.location;

        // Check if there's a stone-like block above (pressure)
        const aboveBlock = dimension.getBlock({
            x: location.x,
            y: location.y + 1,
            z: location.z,
        });

        // Stone-like blocks that can press the tofu
        const stoneLikeBlocks = [
            "minecraft:stone",
            "minecraft:stonebrick",
            "minecraft:cobblestone",
            "minecraft:smooth_stone",
            "minecraft:andesite",
            "minecraft:diorite",
            "minecraft:granite",
            "minecraft:deepslate",
            "minecraft:cobbled_deepslate"
        ];

        // Only transform if there's a stone block above
        if (aboveBlock && stoneLikeBlocks.includes(aboveBlock.typeId)) {
            const lowerBlock = dimension.getBlock({
                x: location.x,
                y: location.y - 1,
                z: location.z,
            });
            const tag = lowerBlock?.getTags();
            if (tag && (tag.includes("glass")||tag.includes("dirt"))) return
            // Approximately 3% chance per random tick to transform
            // This creates a noticeable delay but not too long
            if (Math.random() < 0.03) {
                block.setType("tofucraft:ishi_tofu_block");
            }
        }
    }
}
