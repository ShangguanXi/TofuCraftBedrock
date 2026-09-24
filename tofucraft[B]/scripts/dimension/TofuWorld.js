var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { system } from "@minecraft/server";
import { EventAPI } from "../lib/EventAPI";
export const TOFU_WORLD_ID = "tofucraft:tofu_world";
export class TofuWorld {
    /**
     * Registers the Tofu World as a custom dimension (void generator; terrain generation comes later).
     * @param event The startup event.
     */
    static registerTofuWorld(event) {
        event.dimensionRegistry.registerCustomDimension(TOFU_WORLD_ID);
    }
}
__decorate([
    EventAPI.register(system.beforeEvents.startup)
], TofuWorld, "registerTofuWorld", null);
