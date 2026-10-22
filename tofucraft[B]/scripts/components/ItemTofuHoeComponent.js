var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Direction, Player } from "@minecraft/server";
import { itemComponent } from "../lib/CustomComponentAPI";
import { HeldItem } from "../lib/HeldItem";
// Block tilled -> farmland it becomes. Custom hoes do not till on their own, so vanilla soil is handled too.
const TILLS = {
    "tofucraft:momen_tofu_block": "tofucraft:tofu_farmland",
    "minecraft:grass_block": "minecraft:farmland",
    "minecraft:dirt": "minecraft:farmland",
};
/**
 * Tofunian's Hoe (Java ItemTofuHoe): tills momen tofu into tofu farmland, and grass or dirt into farmland like any
 * hoe. The block above must be air and the bottom face does not work.
 */
let ItemTofuHoeComponent = class ItemTofuHoeComponent {
    onUseOn({ source, block, blockFace }) {
        if (!(source instanceof Player) || blockFace === Direction.Down)
            return;
        const result = TILLS[block.typeId];
        if (!result || !block.above()?.isAir)
            return;
        block.setType(result);
        block.dimension.playSound(result === "tofucraft:tofu_farmland" ? "dig.snow" : "use.gravel", block.center());
        HeldItem.damage(source);
    }
};
ItemTofuHoeComponent = __decorate([
    itemComponent("tofucraft:tofu_hoe")
], ItemTofuHoeComponent);
export { ItemTofuHoeComponent };
