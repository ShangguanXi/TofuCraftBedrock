import {
    BlockCustomComponent,
    BlockComponentStepOnEvent,
    BlockComponentRandomTickEvent,
    ItemStack,
    BiomeType
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";

/**
 * Kinu Tofu Block Component
 *
 * Based on Java TofuCraft logic:
 * 1. Fragile - When an entity falls on it, there's a 40% chance the block breaks
 * 2. Freezable - In cold biomes, can slowly transform into dried tofu
 */
@blockComponent("tofucraft:kinu_tofu_block")
export class BlockTofuKinuComponent implements BlockCustomComponent {
    /**
     * Triggered when an entity steps on the block
     * Simulates the fragile behavior - falling entities can break the block
     */
    onStepOn(args: BlockComponentStepOnEvent): void {
        const { block, entity } = args;
        const dimension = block.dimension;
        const location = block.location;
        if (!entity || !dimension) {
            return;
        }
        // Check if entity is falling (negative Y velocity indicates falling)
        const velocity = entity.getVelocity();
        const fallSpeed = Math.abs(velocity.y);

        // If fall speed is significant (> 0.5 threshold similar to Java version)
        if (fallSpeed > 0.3) {

            // 40% chance to break (matching Java version)
            if (Math.random() < 0.4) {
                // Drop 1-3 kinu tofu items
                dimension.spawnItem(new ItemStack("tofucraft:tofukinu", Math.floor(Math.random() * 3) + 1), {
                    x: location.x + 0.5,
                    y: location.y + 0.5,
                    z: location.z + 0.5,
                });
                block.setType("minecraft:air");
            }
        }
    }

    /**
     * Random tick - handles the freezing/drying transformation
     * In cold biomes with air above, the tofu slowly dries
     *
     * Java version conditions:
     * - Biome temperature < 0.15F (cold biomes)
     * - Height > worldHeight - 10 (high altitude)
     * - Air block above
     * - Random tick with rate 5 (~20% chance)
     * - 7 steps to fully transform
     */
    onRandomTick(args: BlockComponentRandomTickEvent): void {
        const { block } = args;
        const dimension = block.dimension;
        const location = block.location;
        const biomeId = dimension.getBiome(location).id
        const biomeType = [
            "minecraft:frozen_ocean",
            "minecraft:ice_plains",
            "minecraft:ice_plains_spikes",
            "minecraft:frozen_river",
            "minecraft:cold_beach",
            "minecraft:cold_taiga",
            "minecraft:snowy_slopes",
            "minecraft:grove",
            "minecraft:frozen_peaks",
            "minecraft:jagged_peaks"
        ]

        if (biomeType.includes(biomeId)) {
            if (location.y - 63 < 10) return
            // Check if above block is air
            const aboveBlock = dimension.getBlock({
                x: location.x,
                y: location.y + 1,
                z: location.z,
            });

            if (!aboveBlock || aboveBlock.typeId !== "minecraft:air") {
                return;
            }

            // Java version uses rate of 5: random.nextInt(5) == 0 means 20% chance
            // Plus 7 steps to transform, so we use lower probability
            // Approximate: 20% * (1/7) ≈ 2.86% per tick
            if (Math.random() < 0.0286) {
                block.setType("tofucraft:dried_tofu_block");
            }
        }
    }
}
