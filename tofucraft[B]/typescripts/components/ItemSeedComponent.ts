import {
    CustomComponentParameters,
    Direction,
    ItemComponentUseOnEvent,
    ItemCustomComponent,
    Player
} from "@minecraft/server";
import { itemComponent } from "../lib/CustomComponentAPI";
import { HeldItem } from "../lib/HeldItem";

interface SeedParams {
    /** Planting rules, tried in order: the block clicked (top face) and the crop placed above it. */
    plants: { on: string[]; place: string }[];
}

/**
 * Seeds that plant different crops depending on the soil (Java ItemSoybeans: farmland -> soybeans, wool -> sprouts;
 * ItemTcSeeds for sesame and hell soybeans). Only the top face of the soil works and the space above must be air.
 */
@itemComponent("tofucraft:seed")
export class ItemSeedComponent implements ItemCustomComponent {
    onUseOn({ source, block, blockFace }: ItemComponentUseOnEvent, parameters: CustomComponentParameters): void {
        if (!(source instanceof Player) || blockFace !== Direction.Up) return;
        const above = block.above();
        if (!above?.isAir) return;
        const rule = (parameters.params as SeedParams).plants.find(p => p.on.includes(block.typeId));
        if (!rule) return;
        above.setType(rule.place);
        HeldItem.consume(source);
        block.dimension.playSound("dig.grass", above.center());
    }
}
