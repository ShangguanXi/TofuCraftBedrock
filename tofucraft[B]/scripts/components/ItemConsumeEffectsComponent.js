var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { itemComponent } from "../lib/CustomComponentAPI";
/**
 * Status effects given when a food is eaten ("minecraft:food" can no longer carry effects), e.g.
 * "tofucraft:consume_effects": [{ "effect": "fire_resistance", "duration": 600 }]
 */
let ItemConsumeEffectsComponent = class ItemConsumeEffectsComponent {
    onConsume({ source }, parameters) {
        for (const e of parameters.params) {
            if (e.chance !== undefined && Math.random() >= e.chance)
                continue;
            source.addEffect(e.effect, e.duration, { amplifier: e.amplifier ?? 0 });
        }
    }
};
ItemConsumeEffectsComponent = __decorate([
    itemComponent("tofucraft:consume_effects")
], ItemConsumeEffectsComponent);
export { ItemConsumeEffectsComponent };
