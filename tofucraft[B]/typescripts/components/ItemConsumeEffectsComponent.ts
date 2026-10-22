import {
    CustomComponentParameters,
    ItemComponentConsumeEvent,
    ItemCustomComponent
} from "@minecraft/server";
import { itemComponent } from "../lib/CustomComponentAPI";

interface ConsumeEffect {
    effect: string;
    /** Ticks. */
    duration: number;
    amplifier?: number;
    /** 0-1, defaults to always. */
    chance?: number;
}

/**
 * Status effects given when a food is eaten ("minecraft:food" can no longer carry effects), e.g.
 * "tofucraft:consume_effects": [{ "effect": "fire_resistance", "duration": 600 }]
 */
@itemComponent("tofucraft:consume_effects")
export class ItemConsumeEffectsComponent implements ItemCustomComponent {
    onConsume({ source }: ItemComponentConsumeEvent, parameters: CustomComponentParameters): void {
        for (const e of parameters.params as ConsumeEffect[]) {
            if (e.chance !== undefined && Math.random() >= e.chance) continue;
            source.addEffect(e.effect, e.duration, { amplifier: e.amplifier ?? 0 });
        }
    }
}
