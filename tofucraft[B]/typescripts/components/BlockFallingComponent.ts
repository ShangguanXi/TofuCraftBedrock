import {
    Block,
    BlockComponentTickEvent,
    BlockCustomComponent
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";

const MAX_DROP = 64;

/**
 * Falling blocks (Java BlockFalling: salt block, minced tofu block). Custom blocks cannot become falling block
 * entities, so the block moves straight down to where it would land. Checked by "minecraft:tick" (every 10 ticks).
 */
@blockComponent("tofucraft:falling")
export class BlockFallingComponent implements BlockCustomComponent {
    onTick({ block }: BlockComponentTickEvent): void {
        let target: Block | undefined;
        let below = block.below();
        for (let i = 0; i < MAX_DROP && below && BlockFallingComponent.canFallThrough(below); i++) {
            target = below;
            below = below.below();
        }
        if (!target) return;
        const permutation = block.permutation;
        block.setType("minecraft:air");
        target.setPermutation(permutation);
    }

    /** Java BlockFalling.func_149831_e: air, fire, water and lava. */
    public static canFallThrough(block: Block): boolean {
        return block.isAir || block.isLiquid || block.typeId === "minecraft:fire" || block.typeId === "minecraft:soul_fire"
            || block.typeId.endsWith("_fluid") && block.typeId.startsWith("tofucraft:");
    }
}
