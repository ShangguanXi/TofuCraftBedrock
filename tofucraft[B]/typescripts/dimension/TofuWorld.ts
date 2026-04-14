import { EntityItemPickupBeforeEvent, StartupEvent, system, world } from "@minecraft/server";
import { EventAPI } from "../lib/EventAPI";


export class TofuWorld {
    /**
     * Checks if the given dimension is the Tofu World.
     * @param dimension The dimension to check.
     * @returns True if it's the Tofu World, false otherwise.
     */
    @EventAPI.register(system.beforeEvents.startup)
    static registerTofuWorld(event: StartupEvent): void {
        event.dimensionRegistry.registerCustomDimension("tufocraft:tofu_world")
    }
    @EventAPI.register(world.beforeEvents.entityItemPickup)
    static preventItemPickup(event: EntityItemPickupBeforeEvent): void {
        const entity = event.entity;
        if (entity.dimension.id != "tufocraft:tofu_world") {
            const tofuWorldDimension = world.getDimension("tufocraft:tofu_world");
            system.run(() => {
                entity.teleport(entity.location, { dimension: tofuWorldDimension });
            });
        }
    }
}
