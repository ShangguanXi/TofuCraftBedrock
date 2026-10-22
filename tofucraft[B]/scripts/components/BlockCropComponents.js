var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SproutsCropComponent_1;
import { blockComponent } from "../lib/CustomComponentAPI";
import { CropUtil, FARMLAND_SOIL, MAX_GROWTH, SOYBEAN_SOIL } from "../lib/CropUtil";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";
/**
 * Soybean crop (Java BlockSoybean): a vanilla crop on farmland or tofu farmland.
 * Drops per stage come from the block's loot tables (soybeans, edamame at stages 5-6, extra soybeans when ripe).
 */
let SoybeanCropComponent = class SoybeanCropComponent {
    onRandomTick({ block }) {
        CropUtil.vanillaGrowthTick(block, SOYBEAN_SOIL);
    }
    onPlayerInteract({ block, player }) {
        if (player)
            CropUtil.applyBoneMeal(block, player);
    }
};
SoybeanCropComponent = __decorate([
    blockComponent("tofucraft:soybean_crop")
], SoybeanCropComponent);
export { SoybeanCropComponent };
/**
 * Sesame crop (Java BlockSesame): a vanilla crop that only grows on vanilla farmland.
 */
let SesameCropComponent = class SesameCropComponent {
    onRandomTick({ block }) {
        CropUtil.vanillaGrowthTick(block, FARMLAND_SOIL);
    }
    onPlayerInteract({ block, player }) {
        if (player)
            CropUtil.applyBoneMeal(block, player);
    }
};
SesameCropComponent = __decorate([
    blockComponent("tofucraft:sesame_crop")
], SesameCropComponent);
export { SesameCropComponent };
/**
 * Bean sprouts (Java BlockSprouts): soybeans planted on wool. They wither in bright light (10 or more, sky light
 * counts even at night) and grow without light, much faster (1/2 instead of 1/9) with water next to the wool.
 */
let SproutsCropComponent = SproutsCropComponent_1 = class SproutsCropComponent {
    onRandomTick({ block }) {
        if (Math.max(block.getLightLevel(), block.getSkyLightLevel()) >= 10) {
            TofuBlockUtil.breakNaturally(block);
            return;
        }
        const growth = CropUtil.growth(block);
        if (growth >= MAX_GROWTH)
            return;
        const f = SproutsCropComponent_1.hasWaterBesideWool(block) ? 25 : 3;
        if (Math.floor(Math.random() * (Math.floor(25 / f) + 1)) === 0)
            CropUtil.setGrowth(block, growth + 1);
    }
    onPlayerInteract({ block, player }) {
        if (player)
            CropUtil.applyBoneMeal(block, player);
    }
    static hasWaterBesideWool(block) {
        const wool = block.below();
        if (!wool)
            return false;
        return [wool.north(), wool.south(), wool.east(), wool.west()].some(b => TofuBlockUtil.isWater(b));
    }
};
SproutsCropComponent = SproutsCropComponent_1 = __decorate([
    blockComponent("tofucraft:sprouts_crop")
], SproutsCropComponent);
export { SproutsCropComponent };
/**
 * Hell soybeans (Java BlockSoybeanHell): grow on soul sand in any light, 1/4 per random tick. Bone meal does not
 * work on them, so the block has no interaction.
 */
let HellSoybeanCropComponent = class HellSoybeanCropComponent {
    onRandomTick({ block }) {
        const growth = CropUtil.growth(block);
        if (growth < MAX_GROWTH && Math.random() < 1 / 4)
            CropUtil.setGrowth(block, growth + 1);
    }
};
HellSoybeanCropComponent = __decorate([
    blockComponent("tofucraft:hell_soybean_crop")
], HellSoybeanCropComponent);
export { HellSoybeanCropComponent };
