var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BlockFallingComponent_1;
import { blockComponent } from "../lib/CustomComponentAPI";
const MAX_DROP = 64;
/**
 * Falling blocks (Java BlockFalling: salt block, minced tofu block). Custom blocks cannot become falling block
 * entities, so the block moves straight down to where it would land. Checked by "minecraft:tick" (every 10 ticks).
 */
let BlockFallingComponent = BlockFallingComponent_1 = class BlockFallingComponent {
    onTick({ block }) {
        let target;
        let below = block.below();
        for (let i = 0; i < MAX_DROP && below && BlockFallingComponent_1.canFallThrough(below); i++) {
            target = below;
            below = below.below();
        }
        if (!target)
            return;
        const permutation = block.permutation;
        block.setType("minecraft:air");
        target.setPermutation(permutation);
    }
    /** Java BlockFalling.func_149831_e: air, fire, water and lava. */
    static canFallThrough(block) {
        return block.isAir || block.isLiquid || block.typeId === "minecraft:fire" || block.typeId === "minecraft:soul_fire"
            || block.typeId.endsWith("_fluid") && block.typeId.startsWith("tofucraft:");
    }
};
BlockFallingComponent = BlockFallingComponent_1 = __decorate([
    blockComponent("tofucraft:falling")
], BlockFallingComponent);
export { BlockFallingComponent };
