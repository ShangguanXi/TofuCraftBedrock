import { ItemStack } from "@minecraft/server";
import { BIOME_TEMPERATURE } from "../data/BiomeTemperature";
// Tofu blocks made of Material.iron in Java; every other tofu block is Material.tofu and never counts as weight.
const HEAVY_TOFU_BLOCKS = new Set(["tofucraft:metal_tofu_block", "tofucraft:adv_tofu_gem_block"]);
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
/**
 * Shared checks for tofu blocks, ported from Java TofuCraft BlockTofu / TofuBlockUtils.
 */
export class TofuBlockUtil {
    /**
     * Java: the block's material is rock or iron.
     * Bedrock has no materials, so stone/metal tags and pickaxe-mined blocks stand in for them.
     */
    static isHeavy(block) {
        if (block.typeId.startsWith("tofucraft:"))
            return HEAVY_TOFU_BLOCKS.has(block.typeId);
        return block.hasTag("stone") || block.hasTag("metal") || block.hasTag("minecraft:is_pickaxe_item_destructible");
    }
    /**
     * Java: isNormalCube() and (rock or iron material, or hardness >= 1.0, or hardness < 0).
     * Axe-mined blocks (planks, logs, chests...) cover the vanilla blocks with hardness >= 1.0.
     */
    static isFirmBase(block) {
        if (block.isAir || block.isLiquid || !block.isSolid)
            return false;
        if (block.typeId.startsWith("tofucraft:"))
            return HARD_TOFU_BLOCKS.has(block.typeId);
        return this.isHeavy(block)
            || block.hasTag("wood")
            || block.hasTag("log")
            || block.hasTag("minecraft:is_axe_item_destructible")
            || UNBREAKABLE_BLOCKS.has(block.typeId);
    }
    /**
     * Java BlockTofu.isUnderWeight: a heavy block above and a firm block below.
     */
    static isUnderWeight(block) {
        try {
            const above = block.above();
            const below = block.below();
            return !!above && !!below && this.isHeavy(above) && this.isFirmBase(below);
        }
        catch {
            // A neighbour in an unloaded chunk or outside the world counts as no weight.
            return false;
        }
    }
    /**
     * Java BlockTofu.isValidPlaceForDriedTofu: colder than 0.15, at most 9 blocks below the surface, air above.
     */
    static canFreeze(block) {
        try {
            if (!block.above()?.isAir)
                return false;
            const { dimension, location } = block;
            const top = dimension.getTopmostBlock({ x: location.x, z: location.z });
            // Java compares with the height map (first air above the surface): heightValue - 10 < y.
            if (top && location.y <= top.y - 9)
                return false;
            return this.temperatureAt(dimension.getBiome(location), location.y) < 0.15;
        }
        catch {
            return false;
        }
    }
    /**
     * Java BiomeGenBase.getFloatTemperature without its small noise term: 0.05 colder every 30 blocks above y = 64.
     * Biomes missing from the vanilla table (custom biomes) fall back to their tags.
     */
    static temperatureAt(biome, y) {
        let temperature = BIOME_TEMPERATURE[biome.id];
        if (temperature === undefined) {
            temperature = biome.hasTags(["frozen"]) ? 0 : biome.hasTags(["cold"]) ? 0.05 : 0.8;
        }
        if (y > 64)
            temperature -= ((y - 64) * 0.05) / 30;
        return temperature;
    }
    /**
     * Breaks a kinu tofu block the way Java does: each of its 4 drops survives with a 40% chance.
     */
    static crushKinu(block) {
        let count = 0;
        for (let i = 0; i < 4; i++) {
            if (Math.random() < 0.4)
                count++;
        }
        const dimension = block.dimension;
        const center = block.center();
        block.setType("minecraft:air");
        if (count > 0) {
            dimension.spawnItem(new ItemStack("tofucraft:kinu_tofu", count), center);
        }
    }
}
