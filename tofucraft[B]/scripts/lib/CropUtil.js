import { HeldItem } from "./HeldItem";
export const GROWTH = "tofucraft:growth";
export const MAX_GROWTH = 7;
const vanillaFarmlandMoist = (block) => (block.permutation.getState("moisturized_amount") ?? 0) > 0;
export const FARMLAND_SOIL = {
    supports: block => block.typeId === "minecraft:farmland",
    isFertile: vanillaFarmlandMoist,
};
/** Soybeans also grow on tofu farmland (Java BlockTofuFarmland.canSustainPlant). */
export const SOYBEAN_SOIL = {
    supports: block => block.typeId === "minecraft:farmland" || block.typeId === "tofucraft:tofu_farmland",
    isFertile: block => block.typeId === "tofucraft:tofu_farmland"
        ? (block.permutation.getState("tofucraft:moisture") ?? 0) > 0
        : vanillaFarmlandMoist(block),
};
const randomInt = (bound) => Math.floor(Math.random() * bound);
/**
 * Crop growth ported from Java 1.7.10 BlockCrops.
 */
export class CropUtil {
    static growth(block) {
        return block.permutation.getState(GROWTH) ?? 0;
    }
    static setGrowth(block, growth) {
        block.setPermutation(block.permutation.withState(GROWTH, Math.min(MAX_GROWTH, growth)));
    }
    /**
     * Java BlockCrops.updateTick: needs light 9 above, then grows with 1 / (int(25 / f) + 1) per random tick.
     */
    static vanillaGrowthTick(block, soil) {
        const growth = this.growth(block);
        if (growth >= MAX_GROWTH)
            return;
        if ((block.above()?.getLightLevel() ?? 0) < 9)
            return;
        const f = this.growthFactor(block, soil);
        if (randomInt(Math.floor(25 / f) + 1) === 0)
            this.setGrowth(block, growth + 1);
    }
    /**
     * Java BlockCrops.func_149864_n: 1 + the soil below (1, moist 3) + each of the 8 soils around it (a quarter of that),
     * halved when the same crop grows diagonally or in both directions (crops grow faster in rows).
     */
    static growthFactor(block, soil) {
        const at = (dx, dy, dz) => {
            try {
                return block.offset({ x: dx, y: dy, z: dz });
            }
            catch {
                return undefined;
            }
        };
        const same = (dx, dz) => at(dx, 0, dz)?.typeId === block.typeId;
        const alongX = same(-1, 0) || same(1, 0);
        const alongZ = same(0, -1) || same(0, 1);
        const diagonal = same(-1, -1) || same(1, -1) || same(1, 1) || same(-1, 1);
        let f = 1;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const below = at(dx, -1, dz);
                let f1 = 0;
                if (below && soil.supports(below))
                    f1 = soil.isFertile(below) ? 3 : 1;
                if (dx !== 0 || dz !== 0)
                    f1 /= 4;
                f += f1;
            }
        }
        if (diagonal || (alongX && alongZ))
            f /= 2;
        return f;
    }
    /**
     * Java BlockCrops.func_149863_m: bone meal adds 2-5 stages. Returns true when the bone meal was used.
     */
    static applyBoneMeal(block, player) {
        if (HeldItem.get(player)?.typeId !== "minecraft:bone_meal")
            return false;
        const growth = this.growth(block);
        if (growth >= MAX_GROWTH)
            return false;
        this.setGrowth(block, growth + 2 + randomInt(4));
        HeldItem.consume(player);
        block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.center());
        block.dimension.playSound("item.bone_meal.use", block.center());
        return true;
    }
}
