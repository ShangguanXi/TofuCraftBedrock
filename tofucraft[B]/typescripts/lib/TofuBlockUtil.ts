import { BiomeType, Block, Dimension, ItemStack, WeatherType, world } from "@minecraft/server";
import { BIOME_CLIMATE } from "../data/BiomeClimate";

// Tofu blocks made of Material.iron in Java (metal tofu and the metal stairs, wall, trapdoor and door built from it);
// every other tofu block is Material.tofu (or wood, for fence gates) and never counts as weight.
const HEAVY_TOFU_BLOCKS = new Set([
    "tofucraft:metal_tofu_block",
    "tofucraft:adv_tofu_gem_block",
    "tofucraft:metal_tofu_stairs",
    "tofucraft:metal_tofu_wall",
    "tofucraft:metal_tofu_trapdoor",
    "tofucraft:metal_tofu_door",
]);

// Tofu blocks with a Java hardness of at least 1.0, which makes them a valid base for pressing.
const HARD_TOFU_BLOCKS = new Set([
    "tofucraft:ishi_tofu_block",
    "tofucraft:metal_tofu_block",
    "tofucraft:grilled_tofu_block",
    "tofucraft:dried_tofu_block",
    "tofucraft:fried_tofu_pouch_block",
    "tofucraft:fried_tofu_block",
    "tofucraft:diamond_tofu_block",
    "tofucraft:adv_tofu_gem_block",
]);

// Unbreakable blocks (Java hardness < 0) also count as a valid base.
const UNBREAKABLE_BLOCKS = new Set(["minecraft:bedrock", "minecraft:barrier", "minecraft:end_portal_frame"]);

// Java Material.water: vanilla water and the three TofuCraft fluids.
const WATER_BLOCKS = new Set([
    "minecraft:water",
    "minecraft:flowing_water",
    "tofucraft:soy_milk_fluid",
    "tofucraft:hell_soy_milk_fluid",
    "tofucraft:soy_sauce_fluid",
]);

/**
 * Shared checks for tofu blocks, ported from Java TofuCraft BlockTofu / TofuBlockUtils.
 */
export class TofuBlockUtil {
    /**
     * Java: the block's material is rock or iron.
     * Bedrock has no materials, so stone/metal tags and pickaxe-mined blocks stand in for them.
     */
    public static isHeavy(block: Block): boolean {
        if (block.typeId.startsWith("tofucraft:")) return HEAVY_TOFU_BLOCKS.has(block.typeId);
        return block.hasTag("stone") || block.hasTag("metal") || block.hasTag("minecraft:is_pickaxe_item_destructible");
    }

    /**
     * Java: isNormalCube() and (rock or iron material, or hardness >= 1.0, or hardness < 0).
     * Axe-mined blocks (planks, logs, chests...) cover the vanilla blocks with hardness >= 1.0.
     */
    public static isFirmBase(block: Block): boolean {
        if (block.isAir || block.isLiquid || !block.isSolid) return false;
        if (block.typeId.startsWith("tofucraft:")) return HARD_TOFU_BLOCKS.has(block.typeId);
        return this.isHeavy(block)
            || block.hasTag("wood")
            || block.hasTag("log")
            || block.hasTag("minecraft:is_axe_item_destructible")
            || UNBREAKABLE_BLOCKS.has(block.typeId);
    }

    /**
     * Java BlockTofu.isUnderWeight: a heavy block above and a firm block below.
     */
    public static isUnderWeight(block: Block): boolean {
        try {
            const above = block.above();
            const below = block.below();
            return !!above && !!below && this.isHeavy(above) && this.isFirmBase(below);
        } catch {
            // A neighbour in an unloaded chunk or outside the world counts as no weight.
            return false;
        }
    }

    /**
     * Java BlockTofu.drainOneStep: 1/rate per tick to add a step (0-7 kept in `state`), then 1/(2 * rate) to turn
     * into `next`.
     */
    public static drainOneStep(block: Block, rate: number, next: string, state: "tofucraft:drain_step" = "tofucraft:drain_step"): void {
        const step = block.permutation.getState(state) ?? 0;
        if (step < 7) {
            if (Math.random() < 1 / rate) block.setPermutation(block.permutation.withState(state, step + 1));
        } else if (Math.random() < 1 / (2 * rate)) {
            block.setType(next);
        }
    }

    /**
     * Java BlockTofu.isValidPlaceForDriedTofu: colder than 0.15, at most 9 blocks below the surface, air above.
     */
    public static canFreeze(block: Block): boolean {
        try {
            if (!block.above()?.isAir) return false;
            const { dimension, location } = block;
            const top = dimension.getTopmostBlock({ x: location.x, z: location.z });
            // Java compares with the height map (first air above the surface): heightValue - 10 < y.
            if (top && location.y <= top.y - 9) return false;
            return this.temperatureAt(dimension.getBiome(location), location.y) < 0.15;
        } catch {
            return false;
        }
    }

    /**
     * Java BiomeGenBase.getFloatTemperature without its small noise term: 0.05 colder every 30 blocks above y = 64.
     * Biomes missing from the vanilla table (custom biomes) fall back to their tags.
     */
    public static temperatureAt(biome: BiomeType, y: number): number {
        let temperature = BIOME_CLIMATE[biome.id]?.temperature;
        if (temperature === undefined) {
            temperature = biome.hasTags(["frozen"]) ? 0 : biome.hasTags(["cold"]) ? 0.05 : 0.8;
        }
        if (y > 64) temperature -= ((y - 64) * 0.05) / 30;
        return temperature;
    }

    /**
     * Java BiomeGenBase.rainfall (Bedrock "downfall"). Custom biomes fall back to their tags.
     */
    public static downfallOf(biome: BiomeType): number {
        const downfall = BIOME_CLIMATE[biome.id]?.downfall;
        if (downfall !== undefined) return downfall;
        if (biome.hasTags(["desert"]) || biome.hasTags(["mesa"]) || biome.hasTags(["nether"])) return 0;
        return biome.hasTags(["jungle"]) ? 0.9 : 0.5;
    }

    /** Java Material.water: vanilla water and the TofuCraft fluids. */
    public static isWater(block: Block | undefined): boolean {
        return !!block && (WATER_BLOCKS.has(block.typeId) || block.isWaterlogged);
    }

    /** Java World.canBlockSeeTheSky: full sky light at the block. */
    public static canSeeSky(block: Block): boolean {
        return block.getSkyLightLevel() >= 15;
    }

    /** Java World.isRaining: the dimension is raining or thundering. */
    public static isRaining(dimension: Dimension): boolean {
        return dimension.getWeather() !== WeatherType.Clear;
    }

    /** Java: worldTime % 24000 < 12000. */
    public static isDaytime(): boolean {
        return world.getTimeOfDay() < 12000;
    }

    /**
     * Breaks a kinu tofu block the way Java does: each of its 4 drops survives with a 40% chance.
     */
    public static crushKinu(block: Block): void {
        let count = 0;
        for (let i = 0; i < 4; i++) {
            if (Math.random() < 0.4) count++;
        }
        const dimension = block.dimension;
        const center = block.center();
        block.setType("minecraft:air");
        if (count > 0) {
            dimension.spawnItem(new ItemStack("tofucraft:kinu_tofu", count), center);
        }
    }

    /** Breaks a block as if mined, dropping its loot table. */
    public static breakNaturally(block: Block): void {
        const { x, y, z } = block.location;
        block.dimension.runCommand(`setblock ${x} ${y} ${z} air destroy`);
    }
}
