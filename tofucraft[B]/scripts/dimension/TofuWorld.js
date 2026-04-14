var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { system, world } from "@minecraft/server";
import { EventAPI } from "../lib/EventAPI";
export class TofuWorld {
    /**
     * Checks if the given dimension is the Tofu World.
     * @param dimension The dimension to check.
     * @returns True if it's the Tofu World, false otherwise.
     */
    static registerTofuWorld(event) {
        event.dimensionRegistry.registerCustomDimension("tufocraft:tofu_world");
    }
    static preventItemPickup(event) {
        const entity = event.entity;
        if (entity.dimension.id != "tufocraft:tofu_world") {
            const tofuWorldDimension = world.getDimension("tufocraft:tofu_world");
            system.run(() => {
                entity.teleport(entity.location, { dimension: tofuWorldDimension });
            });
        }
    }
}
__decorate([
    EventAPI.register(system.beforeEvents.startup)
], TofuWorld, "registerTofuWorld", null);
__decorate([
    EventAPI.register(world.beforeEvents.entityItemPickup)
], TofuWorld, "preventItemPickup", null);
