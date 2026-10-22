import {
    Direction,
    ItemComponentUseOnEvent,
    ItemCustomComponent,
    Player
} from "@minecraft/server";
import { itemComponent } from "../lib/CustomComponentAPI";
import { HeldItem } from "../lib/HeldItem";

// Block tilled -> farmland it becomes. Custom hoes do not till on their own, so vanilla soil is handled too.
const TILLS: Record<string, string> = {
    "tofucraft:momen_tofu_block": "tofucraft:tofu_farmland",
    "minecraft:grass_block": "minecraft:farmland",
    "minecraft:dirt": "minecraft:farmland",
};

/**
 * Tofunian's Hoe (Java ItemTofuHoe): tills momen tofu into tofu farmland, and grass or dirt into farmland like any
 * hoe. The block above must be air and the bottom face does not work.
 */
@itemComponent("tofucraft:tofu_hoe")
export class ItemTofuHoeComponent implements ItemCustomComponent {
    onUseOn({ source, block, blockFace }: ItemComponentUseOnEvent): void {
        if (!(source instanceof Player) || blockFace === Direction.Down) return;
        const result = TILLS[block.typeId];
        if (!result || !block.above()?.isAir) return;
        block.setType(result);
        block.dimension.playSound(result === "tofucraft:tofu_farmland" ? "dig.snow" : "use.gravel", block.center());
        HeldItem.damage(source);
    }
}
