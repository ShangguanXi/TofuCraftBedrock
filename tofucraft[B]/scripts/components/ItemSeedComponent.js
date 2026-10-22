var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Direction, Player } from "@minecraft/server";
import { itemComponent } from "../lib/CustomComponentAPI";
import { HeldItem } from "../lib/HeldItem";
/**
 * Seeds that plant different crops depending on the soil (Java ItemSoybeans: farmland -> soybeans, wool -> sprouts;
 * ItemTcSeeds for sesame and hell soybeans). Only the top face of the soil works and the space above must be air.
 */
let ItemSeedComponent = class ItemSeedComponent {
    onUseOn({ source, block, blockFace }, parameters) {
        if (!(source instanceof Player) || blockFace !== Direction.Up)
            return;
        const above = block.above();
        if (!above?.isAir)
            return;
        const rule = parameters.params.plants.find(p => p.on.includes(block.typeId));
        if (!rule)
            return;
        above.setType(rule.place);
        HeldItem.consume(source);
        block.dimension.playSound("dig.grass", above.center());
    }
};
ItemSeedComponent = __decorate([
    itemComponent("tofucraft:seed")
], ItemSeedComponent);
export { ItemSeedComponent };
