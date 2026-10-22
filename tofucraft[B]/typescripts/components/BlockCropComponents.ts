import {
    Block,
    BlockComponentPlayerInteractEvent,
    BlockComponentRandomTickEvent,
    BlockCustomComponent
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { CropUtil, FARMLAND_SOIL, MAX_GROWTH, SOYBEAN_SOIL } from "../lib/CropUtil";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";

/**
 * Soybean crop (Java BlockSoybean): a vanilla crop on farmland or tofu farmland.
 * Drops per stage come from the block's loot tables (soybeans, edamame at stages 5-6, extra soybeans when ripe).
 */
@blockComponent("tofucraft:soybean_crop")
export class SoybeanCropComponent implements BlockCustomComponent {
    onRandomTick({ block }: BlockComponentRandomTickEvent): void {
        CropUtil.vanillaGrowthTick(block, SOYBEAN_SOIL);
    }

    onPlayerInteract({ block, player }: BlockComponentPlayerInteractEvent): void {
        if (player) CropUtil.applyBoneMeal(block, player);
    }
}

/**
 * Sesame crop (Java BlockSesame): a vanilla crop that only grows on vanilla farmland.
 */
@blockComponent("tofucraft:sesame_crop")
export class SesameCropComponent implements BlockCustomComponent {
    onRandomTick({ block }: BlockComponentRandomTickEvent): void {
        CropUtil.vanillaGrowthTick(block, FARMLAND_SOIL);
    }

    onPlayerInteract({ block, player }: BlockComponentPlayerInteractEvent): void {
        if (player) CropUtil.applyBoneMeal(block, player);
    }
}

/**
 * Bean sprouts (Java BlockSprouts): soybeans planted on wool. They wither in bright light (10 or more, sky light
 * counts even at night) and grow without light, much faster (1/2 instead of 1/9) with water next to the wool.
 */
@blockComponent("tofucraft:sprouts_crop")
export class SproutsCropComponent implements BlockCustomComponent {
    onRandomTick({ block }: BlockComponentRandomTickEvent): void {
        if (Math.max(block.getLightLevel(), block.getSkyLightLevel()) >= 10) {
            TofuBlockUtil.breakNaturally(block);
            return;
        }
        const growth = CropUtil.growth(block);
        if (growth >= MAX_GROWTH) return;
        const f = SproutsCropComponent.hasWaterBesideWool(block) ? 25 : 3;
        if (Math.floor(Math.random() * (Math.floor(25 / f) + 1)) === 0) CropUtil.setGrowth(block, growth + 1);
    }

    onPlayerInteract({ block, player }: BlockComponentPlayerInteractEvent): void {
        if (player) CropUtil.applyBoneMeal(block, player);
    }

    private static hasWaterBesideWool(block: Block): boolean {
        const wool = block.below();
        if (!wool) return false;
        return [wool.north(), wool.south(), wool.east(), wool.west()].some(b => TofuBlockUtil.isWater(b));
    }
}

/**
 * Hell soybeans (Java BlockSoybeanHell): grow on soul sand in any light, 1/4 per random tick. Bone meal does not
 * work on them, so the block has no interaction.
 */
@blockComponent("tofucraft:hell_soybean_crop")
export class HellSoybeanCropComponent implements BlockCustomComponent {
    onRandomTick({ block }: BlockComponentRandomTickEvent): void {
        const growth = CropUtil.growth(block);
        if (growth < MAX_GROWTH && Math.random() < 1 / 4) CropUtil.setGrowth(block, growth + 1);
    }
}
