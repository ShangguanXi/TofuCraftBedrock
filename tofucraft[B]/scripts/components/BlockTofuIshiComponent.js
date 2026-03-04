var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { blockComponent } from "../lib/CustomComponentAPI";
/**
 * Ishi (Stone) Tofu Block Component
 *
 * Based on Java TofuCraft logic:
 * 1. When momen_tofu_block is pressed by stone-like blocks above, it transforms into ishi_tofu_block
 * 2. Over time, ishi_tofu_block transforms into metal_tofu_block (handled in random tick)
 *
 * The transformation chain:
 * momen_tofu_block + stone pressure -> ishi_tofu_block -> (time) -> metal_tofu_block
 */
let BlockTofuIshiComponent = class BlockTofuIshiComponent {
    /**
     * Random tick - handles the transformation from ishi to metal tofu
     * After being placed for a long time, stone tofu hardens into metal tofu
     *
     * Java version uses random ticks with a low probability
     */
    onRandomTick(args) {
        const { block } = args;
        const dimension = block.dimension;
        const location = block.location;
        // Check if there's still a stone-like block above (pressure maintained)
        const aboveBlock = dimension.getBlock({
            x: location.x,
            y: location.y + 1,
            z: location.z,
        });
        const lowerBlock = dimension.getBlock({
            x: location.x,
            y: location.y - 1,
            z: location.z,
        });
        // Stone-like blocks that maintain the hardening process
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
        if (aboveBlock && lowerBlock && stoneLikeBlocks.includes(aboveBlock.typeId) && stoneLikeBlocks.includes(lowerBlock.typeId)) {
            // With stone above, the transformation is faster
            // Approximately 1% chance per random tick
            if (Math.random() < 0.01) {
                block.setType("tofucraft:metal_tofu_block");
            }
        }
        else {
            // Without stone above, transformation is slower
            // Approximately 0.2% chance per random tick
            if (Math.random() < 0.002) {
                block.setType("tofucraft:metal_tofu_block");
            }
        }
    }
};
BlockTofuIshiComponent = __decorate([
    blockComponent("tofucraft:ishi_tofu_block")
], BlockTofuIshiComponent);
export { BlockTofuIshiComponent };
