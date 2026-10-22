import { ItemStack, world } from "@minecraft/server";
import { HeldItem } from "../lib/HeldItem";
const FLUIDS = ["tofucraft:soy_milk_fluid", "tofucraft:hell_soy_milk_fluid", "tofucraft:soy_sauce_fluid"];
/**
 * Filled buckets place their fluid through "minecraft:block_placer", which uses the bucket up. Give the empty bucket
 * back (not in creative), and like water, soy milk and soy sauce boil away in the Nether (Java TcFluids); hell soy
 * milk does not.
 */
world.afterEvents.playerPlaceBlock.subscribe(({ block, player, dimension }) => {
    const center = block.center();
    if (dimension.id === "minecraft:nether" && block.typeId !== "tofucraft:hell_soy_milk_fluid") {
        block.setType("minecraft:air");
        dimension.playSound("random.fizz", center);
        for (let i = 0; i < 8; i++) {
            dimension.spawnParticle("minecraft:basic_smoke_particle", { x: block.x + Math.random(), y: block.y + Math.random(), z: block.z + Math.random() });
        }
    }
    if (HeldItem.isCreative(player))
        return;
    const bucket = new ItemStack("minecraft:bucket");
    if (!HeldItem.get(player))
        HeldItem.set(player, bucket);
    else
        HeldItem.give(player, bucket);
}, { blockTypes: FLUIDS });
