import { StartupEvent, system } from "@minecraft/server";
import { EventAPI } from "../lib/EventAPI";

export const TOFU_WORLD_ID = "tofucraft:tofu_world";

export class TofuWorld {
    /**
     * Registers the Tofu World as a custom dimension (void generator; terrain generation comes later).
     * @param event The startup event.
     */
    @EventAPI.register(system.beforeEvents.startup)
    static registerTofuWorld(event: StartupEvent): void {
        event.dimensionRegistry.registerCustomDimension(TOFU_WORLD_ID);
    }
}
