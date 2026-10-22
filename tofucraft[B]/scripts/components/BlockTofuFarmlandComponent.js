var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BlockTofuFarmlandComponent_1;
import { Player, world } from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";
const MOISTURE = "tofucraft:moisture";
const MOMEN = "tofucraft:momen_tofu_block";
/**
 * Tofu Farmland (Java BlockTofuFarmland), tilled from momen tofu with the tofu hoe.
 * - Water within 4 blocks (same level or one up) or rain on it keeps it at full moisture (7).
 * - Otherwise it dries one step per random tick and turns back into momen tofu when dry with no soybeans on it.
 * - Trampling (chance fall distance - 0.5; mobs only with mobGriefing) or a solid block on top turns it back.
 */
let BlockTofuFarmlandComponent = BlockTofuFarmlandComponent_1 = class BlockTofuFarmlandComponent {
    onRandomTick({ block }) {
        const above = block.above();
        if (above && above.isSolid) {
            block.setType(MOMEN);
            return;
        }
        if (BlockTofuFarmlandComponent_1.hasWaterNearby(block) || BlockTofuFarmlandComponent_1.isRainedOn(block)) {
            BlockTofuFarmlandComponent_1.setMoisture(block, 7);
            return;
        }
        const moisture = block.permutation.getState(MOISTURE) ?? 0;
        if (moisture > 0) {
            BlockTofuFarmlandComponent_1.setMoisture(block, moisture - 1);
        }
        else if (above?.typeId !== "tofucraft:soybean_crop") {
            block.setType(MOMEN);
        }
    }
    /**
     * Needs "minecraft:entity_fall_on" on the block for the event to fire.
     */
    onEntityFallOn({ block, entity, fallDistance }) {
        if (!entity || Math.random() >= fallDistance - 0.5)
            return;
        if (!(entity instanceof Player) && !world.gameRules.mobGriefing)
            return;
        block.setType(MOMEN);
    }
    static setMoisture(block, moisture) {
        if ((block.permutation.getState(MOISTURE) ?? 0) !== moisture)
            block.setPermutation(block.permutation.withState(MOISTURE, moisture));
    }
    static hasWaterNearby(block) {
        for (let dx = -4; dx <= 4; dx++) {
            for (let dy = 0; dy <= 1; dy++) {
                for (let dz = -4; dz <= 4; dz++) {
                    try {
                        if (TofuBlockUtil.isWater(block.offset({ x: dx, y: dy, z: dz })))
                            return true;
                    }
                    catch {
                        // unloaded neighbour chunk
                    }
                }
            }
        }
        return false;
    }
    /** Java World.canLightningStrikeAt(y + 1): raining, open sky and a biome where it rains. */
    static isRainedOn(block) {
        const above = block.above();
        if (!above || !TofuBlockUtil.isRaining(block.dimension) || !TofuBlockUtil.canSeeSky(above))
            return false;
        const biome = block.dimension.getBiome(above.location);
        return TofuBlockUtil.downfallOf(biome) > 0 && TofuBlockUtil.temperatureAt(biome, above.location.y) >= 0.15;
    }
};
BlockTofuFarmlandComponent = BlockTofuFarmlandComponent_1 = __decorate([
    blockComponent("tofucraft:tofu_farmland")
], BlockTofuFarmlandComponent);
export { BlockTofuFarmlandComponent };
