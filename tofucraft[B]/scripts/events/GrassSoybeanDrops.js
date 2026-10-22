import { ItemStack, world } from "@minecraft/server";
import { HeldItem } from "../lib/HeldItem";
// Java: grass drops a seed 1 time in 8, picked by weight from wheat seeds (10) and soybeans (2).
const SOYBEAN_CHANCE = (1 / 8) * (2 / 12);
/**
 * Soybeans come from grass, like wheat seeds (Java MinecraftForge.addGrassSeed(soybeans, 2)). Only player breaks
 * drop them, never with shears or in creative. The vanilla loot table is left alone so other add-ons keep working.
 */
world.afterEvents.playerBreakBlock.subscribe(({ block, player, itemStackBeforeBreak, dimension }) => {
    if (HeldItem.isCreative(player) || itemStackBeforeBreak?.typeId === "minecraft:shears")
        return;
    if (Math.random() < SOYBEAN_CHANCE)
        dimension.spawnItem(new ItemStack("tofucraft:soybeans"), block.center());
}, { blockTypes: ["minecraft:short_grass", "minecraft:fern"] });
