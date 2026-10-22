// Node smoke test for the behavior pack scripts (mocked @minecraft/server, not the real game).
// Run from the repo root: node --import ./tools/test/loader.mjs tools/test/smoke-test.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as mc from "./mock-server.mjs";
import { FakeDimension, FakePermutation, makePlayer, tool, withRandom } from "./fake-world.mjs";
import * as S from "../gen/shapes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BP = path.join(ROOT, "tofucraft[B]");
let failures = 0, passes = 0;
function check(name, condition, detail = "") {
    if (condition) passes++;
    else { failures++; console.log(`FAIL ${name}${detail ? ` - ${detail}` : ""}`); }
}
/** Runs one scenario; an exception counts as a failure instead of stopping the test. */
function scenario(name, fn) {
    try { fn(); } catch (e) { failures++; console.log(`FAIL ${name} - threw ${e.message}`); }
}
/** A column of blocks listed bottom to top; the entry starting with "*" is the tested block, at y = `at`. */
function column(stack, options = {}, at = 64) {
    const dimension = new FakeDimension(options);
    const base = at - stack.findIndex(s => s.startsWith("*"));
    stack.forEach((typeId, i) => dimension.set({ x: 0, y: base + i, z: 0 }, typeId.replace("*", "")));
    return { dimension, block: dimension.getBlock({ x: 0, y: at, z: 0 }) };
}
/** Runs the callbacks scripts queued with system.run. */
const flush = () => { for (const callback of mc.queued.run.splice(0)) callback(); };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

// ---------- load the pack like the game: early execution, then startup ----------
try {
    await import(pathToFileURL(path.join(BP, "scripts/main.js")).href);
    check("scripts load in early execution", true);
} catch (e) {
    check("scripts load in early execution", false, e.message);
}
mc.dispatch("system.beforeEvents.startup", mc.makeStartupEvent());
mc.state.earlyExecution = false;

const blocks = mc.registered.block, items = mc.registered.item;
for (const file of walk(path.join(BP, "blocks")).filter(f => f.endsWith(".json"))) {
    const body = JSON.parse(fs.readFileSync(file, "utf8"))["minecraft:block"];
    for (const c of [body.components, ...(body.permutations ?? []).map(p => p.components)]) {
        for (const key of Object.keys(c).filter(k => k.startsWith("tofucraft:"))) check(`${path.basename(file)} uses registered ${key}`, blocks.has(key));
    }
}
for (const file of walk(path.join(BP, "items")).filter(f => f.endsWith(".json"))) {
    const c = JSON.parse(fs.readFileSync(file, "utf8"))["minecraft:item"].components;
    for (const key of Object.keys(c).filter(k => k.startsWith("tofucraft:"))) check(`${path.basename(file)} uses registered ${key}`, items.has(key));
}
check("Tofu World registered as tofucraft:tofu_world", JSON.stringify(mc.registered.dimensions) === JSON.stringify(["tofucraft:tofu_world"]), JSON.stringify(mc.registered.dimensions));
check("no item pickup hook (debug teleport removed)", !mc.subscriptions.has("world.beforeEvents.entityItemPickup"));

const kinu = blocks.get("tofucraft:kinu_tofu_block");
const momen = blocks.get("tofucraft:momen_tofu_block");
const ishi = blocks.get("tofucraft:ishi_tofu_block");
const state = (block, name) => block.permutation.getState(name);

// ---------- kinu: crushing ----------
scenario("kinu fall", () => {
    const { dimension, block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"]);
    withRandom(0, () => kinu.onEntityFallOn({ block, entity: new mc.Player(), fallDistance: 1.25 }));
    check("kinu: player falling 1.25 crushes it", block.isAir);
    check("kinu: crushed kinu drops tofucraft:kinu_tofu x4 when every 40% roll succeeds", dimension.count("tofucraft:kinu_tofu") === 4);
});
scenario("kinu fall 0.4", () => {
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"]);
    kinu.onEntityFallOn({ block, entity: new mc.Player(), fallDistance: 0.4 });
    check("kinu: falling 0.4 does nothing", block.typeId === "tofucraft:kinu_tofu_block");
});
scenario("kinu mobGriefing", () => {
    mc.state.gameRules.mobGriefing = false;
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"]);
    kinu.onEntityFallOn({ block, entity: new mc.Entity("minecraft:zombie"), fallDistance: 3 });
    check("kinu: mobs do not crush it with mobGriefing off", block.typeId === "tofucraft:kinu_tofu_block");
    mc.state.gameRules.mobGriefing = true;
    kinu.onEntityFallOn({ block, entity: new mc.Entity("minecraft:zombie"), fallDistance: 3 });
    check("kinu: mobs crush it with mobGriefing on", block.isAir);
});
scenario("kinu weight", () => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:kinu_tofu_block", "minecraft:stone"]);
    withRandom(0.99, () => kinu.onRandomTick({ block }));
    check("kinu: stone on top of planks crushes it", block.isAir);
    const soft = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block", "minecraft:stone"]);
    withRandom(0, () => kinu.onRandomTick({ block: soft.block }));
    check("kinu: dirt is no firm base, so no crushing", soft.block.typeId === "tofucraft:kinu_tofu_block");
});

// ---------- kinu: freezing in 7 steps ----------
scenario("kinu freeze steps", () => {
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"], { biome: "minecraft:ice_plains" });
    withRandom(0, () => kinu.onRandomTick({ block }));
    check("kinu: a cold tick adds a freeze step", state(block, "tofucraft:freeze_step") === 1 && block.typeId === "tofucraft:kinu_tofu_block");
    withRandom(0.5, () => kinu.onRandomTick({ block }));
    check("kinu: a failed 1/5 roll adds nothing", state(block, "tofucraft:freeze_step") === 1);
    block.setPermutation(block.permutation.withState("tofucraft:freeze_step", 7));
    withRandom(0.99, () => kinu.onRandomTick({ block }));
    check("kinu: step 7 turns into dried tofu on the next cold tick", block.typeId === "tofucraft:dried_tofu_block");
});
scenario("kinu freeze conditions", () => {
    const warm = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"], { biome: "minecraft:plains" });
    withRandom(0, () => kinu.onRandomTick({ block: warm.block }));
    check("kinu: does not freeze in plains", state(warm.block, "tofucraft:freeze_step") === undefined);
    const covered = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block", "minecraft:glass"], { biome: "minecraft:ice_plains" });
    withRandom(0, () => kinu.onRandomTick({ block: covered.block }));
    check("kinu: needs air above to freeze", state(covered.block, "tofucraft:freeze_step") === undefined);
    const deep = new FakeDimension({ biome: "minecraft:ice_plains" });
    deep.set({ x: 0, y: 64, z: 0 }, "tofucraft:kinu_tofu_block");
    deep.set({ x: 0, y: 84, z: 0 }, "minecraft:dirt");
    const deepBlock = deep.getBlock({ x: 0, y: 64, z: 0 });
    withRandom(0, () => kinu.onRandomTick({ block: deepBlock }));
    check("kinu: does not freeze deep below the surface", state(deepBlock, "tofucraft:freeze_step") === undefined);
    const high = column(["minecraft:stone", "*tofucraft:kinu_tofu_block"], { biome: "minecraft:extreme_hills" }, 100);
    withRandom(0, () => kinu.onRandomTick({ block: high.block }));
    check("kinu: extreme hills (0.2) are cold enough at y=100", state(high.block, "tofucraft:freeze_step") === 1);
    const low = column(["minecraft:stone", "*tofucraft:kinu_tofu_block"], { biome: "minecraft:extreme_hills" }, 80);
    withRandom(0, () => kinu.onRandomTick({ block: low.block }));
    check("kinu: extreme hills are too warm at y=80", state(low.block, "tofucraft:freeze_step") === undefined);
    const custom = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"], { biome: "custom:snowland", biomeTags: ["frozen"] });
    withRandom(0, () => kinu.onRandomTick({ block: custom.block }));
    check("kinu: unknown biomes fall back to the frozen tag", state(custom.block, "tofucraft:freeze_step") === 1);
});

// ---------- momen / ishi: pressing in 7 steps ----------
scenario("momen pressing", () => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:momen_tofu_block", "minecraft:cobblestone"]);
    withRandom(0, () => momen.onRandomTick({ block }));
    check("momen: pressing adds a drain step", state(block, "tofucraft:drain_step") === 1 && block.typeId === "tofucraft:momen_tofu_block");
    block.setPermutation(block.permutation.withState("tofucraft:drain_step", 7));
    withRandom(0.1, () => momen.onRandomTick({ block }));
    check("momen: step 7 hardens into ishi with a 1/6 roll", block.typeId === "tofucraft:ishi_tofu_block");
    const light = column(["minecraft:oak_planks", "*tofucraft:momen_tofu_block"]);
    withRandom(0, () => momen.onRandomTick({ block: light.block }));
    check("momen: nothing on top, nothing happens", state(light.block, "tofucraft:drain_step") === undefined);
    const tofuWeight = column(["minecraft:oak_planks", "*tofucraft:momen_tofu_block", "tofucraft:ishi_tofu_block"]);
    withRandom(0, () => momen.onRandomTick({ block: tofuWeight.block }));
    check("momen: ishi tofu on top is no weight (Java: tofu material)", state(tofuWeight.block, "tofucraft:drain_step") === undefined);
});
scenario("ishi pressing", () => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:ishi_tofu_block"]);
    block.setPermutation(block.permutation.withState("tofucraft:drain_step", 7));
    withRandom(0, () => ishi.onRandomTick({ block }));
    check("ishi: never hardens without weight", block.typeId === "tofucraft:ishi_tofu_block");
    const pressed = column(["minecraft:stone", "*tofucraft:ishi_tofu_block", "tofucraft:metal_tofu_block"]);
    pressed.block.setPermutation(pressed.block.permutation.withState("tofucraft:drain_step", 7));
    withRandom(0.05, () => ishi.onRandomTick({ block: pressed.block }));
    check("ishi: step 7 under metal tofu hardens into metal tofu (1/16 roll)", pressed.block.typeId === "tofucraft:metal_tofu_block");
});

// ---------- crops ----------
const soybean = blocks.get("tofucraft:soybean_crop");
const sesame = blocks.get("tofucraft:sesame_crop");
const sprouts = blocks.get("tofucraft:sprouts_crop");
const hellSoybean = blocks.get("tofucraft:hell_soybean_crop");
/** A 3x3 patch of `soil` at y 63 with the crop in the middle at y 64. */
function patch(soil, soilStates, crop, options) {
    const dimension = new FakeDimension(options);
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) dimension.set({ x, y: 63, z }, soil, soilStates);
    return { dimension, block: dimension.set({ x: 0, y: 64, z: 0 }, crop) };
}
scenario("soybean growth", () => {
    // f = 1 + 3 (moist below) + 8 * 3/4 = 10 -> 1 / (int(25 / 10) + 1) = 1/3
    const { block } = patch("minecraft:farmland", { moisturized_amount: 7 }, "tofucraft:soybean_crop");
    withRandom(0.3, () => soybean.onRandomTick({ block }));
    check("soybean: grows with a 1/3 roll on moist farmland", state(block, "tofucraft:growth") === 1);
    withRandom(0.34, () => soybean.onRandomTick({ block }));
    check("soybean: a roll above 1/3 does not grow", state(block, "tofucraft:growth") === 1);
    const dark = patch("minecraft:farmland", { moisturized_amount: 7 }, "tofucraft:soybean_crop", { sky: 0 });
    withRandom(0, () => soybean.onRandomTick({ block: dark.block }));
    check("soybean: needs light 9", state(dark.block, "tofucraft:growth") === undefined);
    const tofuSoil = patch("tofucraft:tofu_farmland", { "tofucraft:moisture": 3 }, "tofucraft:soybean_crop");
    withRandom(0.3, () => soybean.onRandomTick({ block: tofuSoil.block }));
    check("soybean: tofu farmland counts as moist soil", state(tofuSoil.block, "tofucraft:growth") === 1);
    // Crops on both axes halve f: 10 / 2 = 5 -> 1 / (5 + 1)
    const rows = patch("minecraft:farmland", { moisturized_amount: 7 }, "tofucraft:soybean_crop");
    rows.dimension.set({ x: 1, y: 64, z: 0 }, "tofucraft:soybean_crop");
    rows.dimension.set({ x: 0, y: 64, z: 1 }, "tofucraft:soybean_crop");
    withRandom(0.2, () => soybean.onRandomTick({ block: rows.block }));
    check("soybean: neighbours on both axes slow it to 1/6", state(rows.block, "tofucraft:growth") === undefined);
    withRandom(0.1, () => soybean.onRandomTick({ block: rows.block }));
    check("soybean: ...and a 1/6 roll still grows it", state(rows.block, "tofucraft:growth") === 1);
});
scenario("sesame soil", () => {
    const { block } = patch("minecraft:farmland", { moisturized_amount: 0 }, "tofucraft:sesame_crop");
    // dry: f = 1 + 1 + 8 * 1/4 = 4 -> 1 / (6 + 1)
    withRandom(0.1, () => sesame.onRandomTick({ block }));
    check("sesame: dry farmland grows with 1/7", state(block, "tofucraft:growth") === 1);
});
scenario("bone meal", () => {
    const { dimension, block } = patch("minecraft:farmland", { moisturized_amount: 7 }, "tofucraft:soybean_crop");
    const player = makePlayer({ held: new mc.ItemStack("minecraft:bone_meal", 3), dimension });
    withRandom(0, () => soybean.onPlayerInteract({ block, player }));
    check("bone meal: adds 2-5 stages (2 on the lowest roll)", state(block, "tofucraft:growth") === 2);
    check("bone meal: uses one bone meal", player.mainhand.amount === 2);
    block.setPermutation(block.permutation.withState("tofucraft:growth", 6));
    withRandom(0.99, () => soybean.onPlayerInteract({ block, player }));
    check("bone meal: caps at stage 7", state(block, "tofucraft:growth") === 7);
    withRandom(0, () => soybean.onPlayerInteract({ block, player }));
    check("bone meal: not used on a ripe crop", player.mainhand.amount === 1);
    check("hell soybeans: bone meal does not work (no interaction)", !hellSoybean.onPlayerInteract);
});
scenario("sprouts", () => {
    const dark = column(["minecraft:white_wool", "*tofucraft:sprouts_crop"], { sky: 0, light: 0 });
    withRandom(0.1, () => sprouts.onRandomTick({ block: dark.block }));
    check("sprouts: grow in the dark on wool (1/9)", state(dark.block, "tofucraft:growth") === 1);
    const wet = column(["minecraft:white_wool", "*tofucraft:sprouts_crop"], { sky: 0, light: 0 });
    wet.dimension.set({ x: 1, y: 63, z: 0 }, "minecraft:water");
    withRandom(0.4, () => sprouts.onRandomTick({ block: wet.block }));
    check("sprouts: water beside the wool makes it 1/2", state(wet.block, "tofucraft:growth") === 1);
    const bright = column(["minecraft:white_wool", "*tofucraft:sprouts_crop"], { sky: 15 });
    withRandom(0, () => sprouts.onRandomTick({ block: bright.block }));
    check("sprouts: wither in light 10+", bright.block.isAir && bright.dimension.destroyed[0]?.typeId === "tofucraft:sprouts_crop");
});
scenario("hell soybeans", () => {
    const { block } = column(["minecraft:soul_sand", "*tofucraft:hell_soybean_crop"], { sky: 0 });
    withRandom(0.2, () => hellSoybean.onRandomTick({ block }));
    check("hell soybeans: grow 1/4 in the dark", state(block, "tofucraft:growth") === 1);
});

// ---------- seeds and the tofu hoe ----------
const seed = items.get("tofucraft:seed");
const seedParams = id => ({ params: JSON.parse(fs.readFileSync(walk(path.join(BP, "items")).find(f => f.endsWith(`${path.sep}${id}.json`)), "utf8"))["minecraft:item"].components["tofucraft:seed"] });
scenario("planting", () => {
    const { dimension, block } = column(["*minecraft:farmland"]);
    const player = makePlayer({ held: new mc.ItemStack("tofucraft:soybeans", 5), dimension });
    seed.onUseOn({ source: player, block, blockFace: mc.Direction.Up }, seedParams("soybeans"));
    check("seeds: soybeans on farmland plant a soybean crop", block.above().typeId === "tofucraft:soybean_crop" && player.mainhand.amount === 4);
    const wool = column(["*minecraft:red_wool"]);
    const p2 = makePlayer({ held: new mc.ItemStack("tofucraft:soybeans"), dimension: wool.dimension });
    seed.onUseOn({ source: p2, block: wool.block, blockFace: mc.Direction.Up }, seedParams("soybeans"));
    check("seeds: soybeans on wool plant sprouts", wool.block.above().typeId === "tofucraft:sprouts_crop" && p2.mainhand === undefined);
    const side = column(["*minecraft:farmland"]);
    seed.onUseOn({ source: makePlayer({ held: new mc.ItemStack("tofucraft:soybeans"), dimension: side.dimension }), block: side.block, blockFace: mc.Direction.North }, seedParams("soybeans"));
    check("seeds: only the top face plants", side.block.above().isAir);
    const tofuSoil = column(["*tofucraft:tofu_farmland"]);
    seed.onUseOn({ source: makePlayer({ held: new mc.ItemStack("tofucraft:sesame"), dimension: tofuSoil.dimension }), block: tofuSoil.block, blockFace: mc.Direction.Up }, seedParams("sesame"));
    check("seeds: sesame does not grow on tofu farmland", tofuSoil.block.above().isAir);
    const soul = column(["*minecraft:soul_sand"]);
    seed.onUseOn({ source: makePlayer({ held: new mc.ItemStack("tofucraft:hell_soybeans"), dimension: soul.dimension }), block: soul.block, blockFace: mc.Direction.Up }, seedParams("hell_soybeans"));
    check("seeds: hell soybeans on soul sand", soul.block.above().typeId === "tofucraft:hell_soybean_crop");
});
scenario("tofu hoe", () => {
    const hoe = items.get("tofucraft:tofu_hoe");
    const { dimension, block } = column(["*tofucraft:momen_tofu_block"]);
    const player = makePlayer({ held: tool("tofucraft:tofu_hoe", 868), dimension });
    hoe.onUseOn({ source: player, block, blockFace: mc.Direction.Up });
    check("tofu hoe: tills momen tofu into tofu farmland", block.typeId === "tofucraft:tofu_farmland");
    check("tofu hoe: takes one durability", player.mainhand.getComponent("minecraft:durability").damage === 1);
    const dirt = column(["*minecraft:dirt"]);
    hoe.onUseOn({ source: makePlayer({ held: tool("tofucraft:tofu_hoe", 868), dimension: dirt.dimension }), block: dirt.block, blockFace: mc.Direction.Up });
    check("tofu hoe: tills dirt into farmland", dirt.block.typeId === "minecraft:farmland");
    const covered = column(["*tofucraft:momen_tofu_block", "minecraft:stone"]);
    hoe.onUseOn({ source: makePlayer({ held: tool("tofucraft:tofu_hoe", 868), dimension: covered.dimension }), block: covered.block, blockFace: mc.Direction.Up });
    check("tofu hoe: needs air above", covered.block.typeId === "tofucraft:momen_tofu_block");
});

// ---------- tofu farmland ----------
const farmland = blocks.get("tofucraft:tofu_farmland");
scenario("tofu farmland", () => {
    const wet = column(["*tofucraft:tofu_farmland"]);
    wet.dimension.set({ x: 3, y: 64, z: 0 }, "minecraft:water");
    farmland.onRandomTick({ block: wet.block });
    check("farmland: water within 4 blocks keeps it at 7", state(wet.block, "tofucraft:moisture") === 7);
    const dry = column(["*tofucraft:tofu_farmland"]);
    dry.block.setPermutation(dry.block.permutation.withState("tofucraft:moisture", 2));
    farmland.onRandomTick({ block: dry.block });
    check("farmland: dries one step without water", state(dry.block, "tofucraft:moisture") === 1);
    const bare = column(["*tofucraft:tofu_farmland"]);
    farmland.onRandomTick({ block: bare.block });
    check("farmland: dry and bare turns back into momen tofu", bare.block.typeId === "tofucraft:momen_tofu_block");
    const planted = column(["*tofucraft:tofu_farmland", "tofucraft:soybean_crop"]);
    farmland.onRandomTick({ block: planted.block });
    check("farmland: soybeans keep a dry farmland", planted.block.typeId === "tofucraft:tofu_farmland");
    const rained = column(["*tofucraft:tofu_farmland"], { weather: mc.WeatherType.Rain });
    farmland.onRandomTick({ block: rained.block });
    check("farmland: rain keeps it moist", state(rained.block, "tofucraft:moisture") === 7);
    const trampled = column(["*tofucraft:tofu_farmland"]);
    withRandom(0.1, () => farmland.onEntityFallOn({ block: trampled.block, entity: new mc.Player(), fallDistance: 1 }));
    check("farmland: trampled back into momen tofu", trampled.block.typeId === "tofucraft:momen_tofu_block");
});

// ---------- fluids, buckets and bittern ----------
const fluid = blocks.get("tofucraft:fluid");
const fluidParams = id => ({ params: JSON.parse(fs.readFileSync(path.join(BP, "blocks/fluid", `${id}.json`), "utf8"))["minecraft:block"].components["tofucraft:fluid"] });
scenario("bucket pickup", () => {
    const { dimension, block } = column(["minecraft:stone", "*tofucraft:soy_milk_fluid"]);
    const player = makePlayer({ held: new mc.ItemStack("minecraft:bucket"), dimension });
    fluid.onPlayerInteract({ block, player }, fluidParams("soy_milk_fluid"));
    check("bucket: scoops soy milk into a soy milk bucket", block.isAir && player.mainhand?.typeId === "tofucraft:soy_milk_bucket");
    const stack = column(["minecraft:stone", "*tofucraft:hell_soy_milk_fluid"]);
    const p2 = makePlayer({ held: new mc.ItemStack("minecraft:bucket", 3), dimension: stack.dimension });
    fluid.onPlayerInteract({ block: stack.block, player: p2 }, fluidParams("hell_soy_milk_fluid"));
    check("bucket: from a stack, one bucket is filled and goes to the inventory", p2.mainhand.amount === 2 && p2.inventory[0]?.typeId === "tofucraft:hell_soy_milk_bucket");
});
scenario("bittern", () => {
    const { dimension, block } = column(["minecraft:stone", "*tofucraft:soy_milk_fluid"]);
    const player = makePlayer({ held: new mc.ItemStack("tofucraft:nigari", 2), dimension });
    fluid.onPlayerInteract({ block, player }, fluidParams("soy_milk_fluid"));
    check("bittern: soy milk curdles into a kinu tofu block", block.typeId === "tofucraft:kinu_tofu_block");
    check("bittern: one used, the glass bottle comes back", player.mainhand.amount === 1 && player.inventory[0]?.typeId === "minecraft:glass_bottle");
    const hell = column(["minecraft:stone", "*tofucraft:hell_soy_milk_fluid"]);
    fluid.onPlayerInteract({ block: hell.block, player: makePlayer({ held: new mc.ItemStack("tofucraft:nigari"), dimension: hell.dimension }) }, fluidParams("hell_soy_milk_fluid"));
    check("bittern: hell soy milk curdles into a hell tofu block", hell.block.typeId === "tofucraft:hell_tofu_block");
    const sauce = column(["minecraft:stone", "*tofucraft:soy_sauce_fluid"]);
    fluid.onPlayerInteract({ block: sauce.block, player: makePlayer({ held: new mc.ItemStack("tofucraft:nigari"), dimension: sauce.dimension }) }, fluidParams("soy_sauce_fluid"));
    check("bittern: does nothing to soy sauce", sauce.block.typeId === "tofucraft:soy_sauce_fluid");
    const creative = column(["minecraft:stone", "*tofucraft:soy_milk_fluid"]);
    const builder = makePlayer({ held: new mc.ItemStack("tofucraft:nigari"), gameMode: mc.GameMode.Creative, dimension: creative.dimension });
    fluid.onPlayerInteract({ block: creative.block, player: builder }, fluidParams("soy_milk_fluid"));
    check("bittern: creative players keep it", builder.mainhand?.typeId === "tofucraft:nigari" && builder.inventory.length === 0);
});
scenario("bucket placement", () => {
    const { dimension, block } = column(["minecraft:stone", "*tofucraft:soy_milk_fluid"]);
    const player = makePlayer({ held: undefined, dimension });
    mc.dispatch("world.afterEvents.playerPlaceBlock", { block, player, dimension });
    check("placement: the empty bucket comes back", player.mainhand?.typeId === "minecraft:bucket" && block.typeId === "tofucraft:soy_milk_fluid");
    const nether = column(["minecraft:netherrack", "*tofucraft:soy_milk_fluid"], { id: "minecraft:nether" });
    mc.dispatch("world.afterEvents.playerPlaceBlock", { block: nether.block, player: makePlayer({ dimension: nether.dimension }), dimension: nether.dimension });
    check("placement: soy milk boils away in the Nether", nether.block.isAir);
    const hell = column(["minecraft:netherrack", "*tofucraft:hell_soy_milk_fluid"], { id: "minecraft:nether" });
    mc.dispatch("world.afterEvents.playerPlaceBlock", { block: hell.block, player: makePlayer({ dimension: hell.dimension }), dimension: hell.dimension });
    check("placement: hell soy milk stays in the Nether", hell.block.typeId === "tofucraft:hell_soy_milk_fluid");
});

// ---------- salt pan ----------
const pan = blocks.get("tofucraft:salt_pan");
scenario("salt pan", () => {
    const dimension = new FakeDimension();
    dimension.set({ x: 0, y: 63, z: 0 }, "minecraft:stone");
    dimension.set({ x: 1, y: 63, z: 0 }, "minecraft:stone");
    const a = dimension.set({ x: 0, y: 64, z: 0 }, "tofucraft:salt_pan");
    pan.onPlace({ block: a });
    const b = dimension.set({ x: 1, y: 64, z: 0 }, "tofucraft:salt_pan");
    pan.onPlace({ block: b });
    check("salt pan: neighbours connect both ways", state(a, "tofucraft:connect_east") === 1 && state(b, "tofucraft:connect_west") === 1 && state(a, "tofucraft:connect_west") === 0);
    const player = makePlayer({ held: new mc.ItemStack("minecraft:water_bucket"), dimension });
    pan.onPlayerInteract({ block: a, player });
    check("salt pan: water fills this pan and the empty ones around it", state(a, "tofucraft:pan_state") === 1 && state(b, "tofucraft:pan_state") === 1);
    check("salt pan: the empty bucket comes back", player.mainhand?.typeId === "minecraft:bucket");
    withRandom(0.2, () => pan.onRandomTick({ block: a }));
    check("salt pan: plains in the day evaporate with 1/4 (rate 8)", state(a, "tofucraft:pan_state") === 2);
    mc.state.timeOfDay = 18000;
    withRandom(0.2, () => pan.onRandomTick({ block: a }));
    check("salt pan: at night plains are 1/7 (rate 4)", state(a, "tofucraft:pan_state") === 2);
    mc.state.timeOfDay = 6000;
    dimension.weather = mc.WeatherType.Rain;
    withRandom(0, () => pan.onRandomTick({ block: a }));
    check("salt pan: nothing evaporates in the rain", state(a, "tofucraft:pan_state") === 2);
    dimension.weather = mc.WeatherType.Clear;
    a.setPermutation(a.permutation.withState("tofucraft:pan_state", 4));
    pan.onPlayerInteract({ block: a, player: makePlayer({ dimension }) });
    check("salt pan: taking the salt drops one and leaves bittern", dimension.count("tofucraft:salt") === 1 && state(a, "tofucraft:pan_state") === 5);
    const bottler = makePlayer({ held: new mc.ItemStack("minecraft:glass_bottle"), dimension });
    pan.onPlayerInteract({ block: a, player: bottler });
    check("salt pan: a glass bottle takes the bittern as nigari", bottler.mainhand?.typeId === "tofucraft:nigari" && state(a, "tofucraft:pan_state") === 0);
    b.setPermutation(b.permutation.withState("tofucraft:pan_state", 5));
    pan.onPlayerInteract({ block: b, player: makePlayer({ dimension }) });
    check("salt pan: an empty hand pours the bittern away", state(b, "tofucraft:pan_state") === 0);
    dimension.set({ x: 1, y: 64, z: 0 }, "minecraft:air");
    pan.onBreak({ block: dimension.getBlock({ x: 1, y: 64, z: 0 }) });
    check("salt pan: breaking a pan disconnects its neighbour", state(a, "tofucraft:connect_east") === 0);
    const desert = column(["minecraft:sand", "*tofucraft:salt_pan"], { biome: "minecraft:desert" });
    desert.block.setPermutation(desert.block.permutation.withState("tofucraft:pan_state", 1));
    withRandom(0.99, () => pan.onRandomTick({ block: desert.block }));
    check("salt pan: deserts evaporate every tick (rate 32)", state(desert.block, "tofucraft:pan_state") === 2);
});

// ---------- falling blocks ----------
scenario("falling", () => {
    const falling = blocks.get("tofucraft:falling");
    const dimension = new FakeDimension();
    dimension.set({ x: 0, y: 60, z: 0 }, "minecraft:stone");
    dimension.set({ x: 0, y: 62, z: 0 }, "minecraft:water");
    const salt = dimension.set({ x: 0, y: 65, z: 0 }, "tofucraft:salt_block");
    falling.onTick({ block: salt });
    check("falling: salt falls through air and water onto the stone", salt.isAir && dimension.getBlock({ x: 0, y: 61, z: 0 }).typeId === "tofucraft:salt_block");
    const resting = dimension.getBlock({ x: 0, y: 61, z: 0 });
    falling.onTick({ block: resting });
    check("falling: a supported block stays", resting.typeId === "tofucraft:salt_block");
});

// ---------- items ----------
scenario("consume effects", () => {
    const effects = items.get("tofucraft:consume_effects");
    const eater = new mc.Player();
    effects.onConsume({ source: eater, itemStack: new mc.ItemStack("tofucraft:hell_tofu") }, { params: [{ effect: "fire_resistance", duration: 600 }] });
    check("consume effects: hell tofu gives Fire Resistance for 30 s", eater.effects[0]?.effect === "fire_resistance" && eater.effects[0]?.duration === 600);
});
scenario("grass soybeans", () => {
    const dimension = new FakeDimension();
    const grass = dimension.getBlock({ x: 0, y: 64, z: 0 });
    const event = (player, item) => ({ block: grass, player, itemStackBeforeBreak: item, dimension, brokenBlockPermutation: { typeId: "minecraft:short_grass" } });
    withRandom(0.02, () => mc.dispatch("world.afterEvents.playerBreakBlock", { ...event(makePlayer({ dimension })), block: { ...grass, typeId: "minecraft:short_grass", center: () => grass.center() } }));
    check("grass: drops soybeans on a 1/48 roll", dimension.count("tofucraft:soybeans") === 1);
    withRandom(0.03, () => mc.dispatch("world.afterEvents.playerBreakBlock", { ...event(makePlayer({ dimension })), block: { typeId: "minecraft:short_grass", center: () => grass.center() } }));
    check("grass: nothing above 1/48", dimension.count("tofucraft:soybeans") === 1);
    withRandom(0, () => mc.dispatch("world.afterEvents.playerBreakBlock", { ...event(makePlayer({ dimension }), new mc.ItemStack("minecraft:shears")), block: { typeId: "minecraft:short_grass", center: () => grass.center() } }));
    check("grass: not with shears", dimension.count("tofucraft:soybeans") === 1);
});

// ---------- construction blocks: shapes (tools/gen/shapes.mjs) ----------
scenario("shapes", () => {
    check("shapes: world boxes map to Bedrock boxes measured from the east", JSON.stringify(S.toBox([0, 0, 0, 8, 8, 8])) === JSON.stringify({ origin: [0, 0, -8], size: [8, 8, 8] }));
    const quarters = (f, c) => S.stairQuarters(f, c).sort().join(" ");
    check("stairs: straight north stairs fill the north quarters", quarters("north", "none") === "north-east north-west");
    check("stairs: Java OUTER_LEFT facing north keeps the north-west quarter", quarters("north", "outer_left") === "north-west");
    check("stairs: Java INNER_RIGHT facing north adds the south-east quarter", quarters("north", "inner_right") === "north-east north-west south-east");
    check("stairs: Java OUTER_RIGHT facing east keeps the south-east quarter", quarters("east", "outer_right") === "south-east");
    check("stairs: Java INNER_LEFT facing east adds the north-west quarter", quarters("east", "inner_left") === "north-east north-west south-east");
    check("stairs: 40 collision states", S.stairsCollisions().length === 40);
    // Java BlockDoor: player facing east (meta 0) puts the closed door on the west side, hinge left = north.
    check("door: closed east-facing door lies on the west side", S.doorPanel("east", 0, 0).side === "west" && S.doorPanel("east", 0, 0).hingeEnd === "north");
    check("door: open left-hinged east-facing door swings to the north side", S.doorPanel("east", 1, 0).side === "north");
    check("door: open right-hinged east-facing door swings to the south side", S.doorPanel("east", 1, 1).side === "south");
    // Java getIcon flips: closed meta 0 flips the east face, open meta 0 flips the north face, hinge right flips back.
    check("door: closed east-facing door mirrors its inner (east) face", S.doorVariant(S.doorPanel("east", 0, 0)) === "b");
    check("door: open east-facing door mirrors its outer (north) face", S.doorVariant(S.doorPanel("east", 1, 0)) === "a");
    check("door: right hinge mirrors the outer (west) face instead", S.doorVariant(S.doorPanel("east", 0, 1)) === "a");
    const walls = S.wallShapes();
    const straight = walls.find(w => w.condition === "q.block_state('minecraft:connection_north') && !q.block_state('minecraft:connection_east') && q.block_state('minecraft:connection_south') && !q.block_state('minecraft:connection_west')");
    check("wall: a straight wall has no post and a 13 px selection box", straight?.collision.length === 2 && straight.selection[4] === 13);
    check("wall: 16 connection states", walls.length === 16);
});

// ---------- construction blocks: kinu fragility ----------
const fragile = blocks.get("tofucraft:fragile");
scenario("fragile", () => {
    const stairs = column(["minecraft:dirt", "*tofucraft:kinu_tofu_stairs"]);
    fragile.onEntityFallOn({ block: stairs.block, entity: new mc.Player(), fallDistance: 1.25 });
    check("fragile: a player falling 1.25 breaks kinu stairs like mining (loot)", stairs.block.isAir && stairs.dimension.destroyed[0]?.typeId === "tofucraft:kinu_tofu_stairs");
    const gate = column(["minecraft:dirt", "*tofucraft:kinu_tofu_fence_gate"]);
    fragile.onEntityFallOn({ block: gate.block, entity: new mc.Player(), fallDistance: 0.5 });
    check("fragile: falling 0.5 does nothing", gate.block.typeId === "tofucraft:kinu_tofu_fence_gate");
    mc.state.gameRules.mobGriefing = false;
    fragile.onEntityFallOn({ block: gate.block, entity: new mc.Entity("minecraft:zombie"), fallDistance: 3 });
    check("fragile: mobs leave it with mobGriefing off", gate.block.typeId === "tofucraft:kinu_tofu_fence_gate");
    mc.state.gameRules.mobGriefing = true;
    const weighed = column(["minecraft:dirt", "*tofucraft:kinu_tofu_stairs", "minecraft:stone"]);
    fragile.onRandomTick({ block: weighed.block }, { params: { weight: true } });
    check("fragile: stone on kinu stairs breaks them", weighed.block.isAir);
    const metal = column(["minecraft:dirt", "*tofucraft:kinu_tofu_stairs", "tofucraft:metal_tofu_stairs"]);
    fragile.onRandomTick({ block: metal.block }, { params: { weight: true } });
    check("fragile: metal tofu stairs (Material.iron) are heavy too", metal.block.isAir);
    const soft = column(["minecraft:dirt", "*tofucraft:kinu_tofu_stairs", "tofucraft:momen_tofu_block"]);
    fragile.onRandomTick({ block: soft.block }, { params: { weight: true } });
    check("fragile: tofu blocks are no weight", soft.block.typeId === "tofucraft:kinu_tofu_stairs");
    const single = column(["minecraft:dirt", "*tofucraft:kinu_tofu_slab", "minecraft:stone"]);
    single.block.setPermutation(single.block.permutation.withState("tofucraft:double", 0));
    fragile.onRandomTick({ block: single.block }, { params: { weight: true } });
    check("fragile: a single kinu slab holds stone (Java weighs double slabs only)", single.block.typeId === "tofucraft:kinu_tofu_slab");
    single.block.setPermutation(single.block.permutation.withState("tofucraft:double", 1));
    fragile.onRandomTick({ block: single.block }, { params: { weight: true } });
    check("fragile: a double kinu slab breaks under stone", single.block.isAir);
    const wall = column(["minecraft:dirt", "*tofucraft:kinu_tofu_wall", "minecraft:stone"]);
    fragile.onRandomTick({ block: wall.block }, { params: {} });
    check("fragile: walls do not break under weight", wall.block.typeId === "tofucraft:kinu_tofu_wall");
});

// ---------- construction blocks: doors ----------
const door = blocks.get("tofucraft:door");
const ironDoor = blocks.get("tofucraft:redstone_door");
function placeDoor(dimension, at, { facing = "north", type = "tofucraft:kinu_tofu_door", player } = {}) {
    const event = {
        block: dimension.getBlock(at),
        dimension,
        face: mc.Direction.Up,
        player: player ?? makePlayer({ dimension }),
        cancel: false,
        permutationToPlace: new FakePermutation(type, { "minecraft:cardinal_direction": facing, "minecraft:multi_block_part": 0, "tofucraft:open": 0, "tofucraft:hinge": 0 }),
    };
    door.beforeOnPlayerPlace(event);
    if (!event.cancel) {
        // The engine places both parts; the upper part starts with default custom states.
        dimension.set(at, type, event.permutationToPlace.states);
        dimension.set({ ...at, y: at.y + 1 }, type, { ...event.permutationToPlace.states, "minecraft:multi_block_part": 1, "tofucraft:hinge": 0 });
        flush();
    }
    return event;
}
scenario("doors", () => {
    const dimension = new FakeDimension();
    for (let x = -2; x <= 4; x++) dimension.set({ x, y: 63, z: 0 }, "minecraft:stone");
    const lone = placeDoor(dimension, { x: 0, y: 64, z: 0 });
    check("door: hinge on the left by default", lone.permutationToPlace.getState("tofucraft:hinge") === 0);
    const lower = dimension.getBlock({ x: 0, y: 64, z: 0 }), upper = lower.above();
    const twin = placeDoor(dimension, { x: 1, y: 64, z: 0 });
    check("door: a door to its left (west, facing north) puts the hinge on the right", twin.permutationToPlace.getState("tofucraft:hinge") === 1);
    check("door: the upper part gets the hinge too", dimension.getBlock({ x: 1, y: 65, z: 0 }).permutation.getState("tofucraft:hinge") === 1);
    dimension.set({ x: 4, y: 64, z: 0 }, "minecraft:stone");
    dimension.set({ x: 4, y: 65, z: 0 }, "minecraft:stone");
    const walled = placeDoor(dimension, { x: 3, y: 64, z: 0 });
    check("door: more solid blocks on the right put the hinge on the right", walled.permutationToPlace.getState("tofucraft:hinge") === 1);
    const floating = placeDoor(dimension, { x: 0, y: 70, z: 5 });
    check("door: cannot be placed without a solid block below", floating.cancel === true);

    door.onPlayerInteract({ block: upper, player: makePlayer({ dimension }) });
    check("door: using either part opens both", state(lower, "tofucraft:open") === 1 && state(upper, "tofucraft:open") === 1 && dimension.sounds.at(-1) === "open.wooden_door");
    door.onPlayerInteract({ block: lower, player: makePlayer({ dimension }) });
    check("door: using it again closes it", state(lower, "tofucraft:open") === 0 && state(upper, "tofucraft:open") === 0 && dimension.sounds.at(-1) === "close.wooden_door");
    door.onRedstoneUpdate({ block: lower, powerLevel: 15, previousPowerLevel: 0 });
    check("door: a rising signal opens it", state(upper, "tofucraft:open") === 1);
    door.onPlayerInteract({ block: lower, player: makePlayer({ dimension }) });
    door.onRedstoneUpdate({ block: lower, powerLevel: 15, previousPowerLevel: 15 });
    check("door: a steady signal leaves a hand-closed door alone", state(lower, "tofucraft:open") === 0);
    door.onRedstoneUpdate({ block: lower, powerLevel: 0, previousPowerLevel: 15 });
    check("door: a falling signal closes it", state(lower, "tofucraft:open") === 0);

    check("metal door: no hand interaction (Material.iron)", !("onPlayerInteract" in ironDoor) && typeof ironDoor.onRedstoneUpdate === "function");
    ironDoor.onRedstoneUpdate({ block: lower, powerLevel: 9, previousPowerLevel: 0 });
    check("metal door: redstone opens it with the iron door sound", state(lower, "tofucraft:open") === 1 && dimension.sounds.at(-1) === "open.iron_door");

    const broken = new FakePermutation("tofucraft:kinu_tofu_door", { "minecraft:multi_block_part": 1 });
    door.onBreak({ block: upper, brokenBlockPermutation: broken, entitySource: makePlayer({ dimension }), dimension });
    check("door: breaking it drops one door item", dimension.count("tofucraft:kinu_tofu_door") === 1);
    door.onBreak({ block: upper, brokenBlockPermutation: broken, entitySource: makePlayer({ dimension, gameMode: mc.GameMode.Creative }), dimension });
    check("door: nothing drops in creative", dimension.count("tofucraft:kinu_tofu_door") === 1);
    door.onBreak({ block: upper, brokenBlockPermutation: broken, dimension });
    check("door: explosions drop it too", dimension.count("tofucraft:kinu_tofu_door") === 2);
});

// ---------- construction blocks: trapdoors and fence gates ----------
scenario("trapdoors", () => {
    const trapdoor = blocks.get("tofucraft:trapdoor");
    const ironTrapdoor = blocks.get("tofucraft:redstone_trapdoor");
    const dimension = new FakeDimension();
    const perm = new FakePermutation("tofucraft:kinu_tofu_trapdoor", { "minecraft:cardinal_direction": "west", "minecraft:vertical_half": "top", "tofucraft:open": 0 });
    const side = { block: dimension.getBlock({ x: 0, y: 64, z: 0 }), dimension, face: mc.Direction.North, permutationToPlace: perm, cancel: false };
    trapdoor.beforeOnPlayerPlace(side);
    check("trapdoor: on the north face of a block it hangs from that block (hinge south)", side.permutationToPlace.getState("minecraft:cardinal_direction") === "south" && side.permutationToPlace.getState("minecraft:vertical_half") === "top");
    const top = { block: side.block, dimension, face: mc.Direction.Up, permutationToPlace: perm, cancel: false };
    trapdoor.beforeOnPlayerPlace(top);
    check("trapdoor: on top of a block it keeps the player's direction", top.permutationToPlace.getState("minecraft:cardinal_direction") === "west");
    const block = dimension.set({ x: 0, y: 64, z: 0 }, "tofucraft:kinu_tofu_trapdoor", side.permutationToPlace.states);
    trapdoor.onPlayerInteract({ block, player: makePlayer({ dimension }) });
    check("trapdoor: using it opens it", state(block, "tofucraft:open") === 1 && dimension.sounds.at(-1) === "open.wooden_trapdoor");
    check("metal trapdoor: redstone only", !("onPlayerInteract" in ironTrapdoor));
    ironTrapdoor.onRedstoneUpdate({ block, powerLevel: 0, previousPowerLevel: 4 });
    check("metal trapdoor: closes when the signal goes off", state(block, "tofucraft:open") === 0 && dimension.sounds.at(-1) === "close.iron_trapdoor");
});
scenario("fence gates", () => {
    const gate = blocks.get("tofucraft:fence_gate");
    const dimension = new FakeDimension();
    const block = dimension.set({ x: 0, y: 64, z: 0 }, "tofucraft:metal_tofu_fence_gate", { "minecraft:cardinal_direction": "north", "tofucraft:open": 0 });
    gate.onPlayerInteract({ block, player: makePlayer({ dimension, yaw: 0 }) });
    check("fence gate: a player facing south opens a north gate away from them (turns it south)", state(block, "tofucraft:open") === 1 && state(block, "minecraft:cardinal_direction") === "south" && dimension.sounds.at(-1) === "open.fence_gate");
    gate.onPlayerInteract({ block, player: makePlayer({ dimension, yaw: 0 }) });
    check("fence gate: using an open gate closes it", state(block, "tofucraft:open") === 0 && dimension.sounds.at(-1) === "close.fence_gate");
    gate.onPlayerInteract({ block, player: makePlayer({ dimension, yaw: 90 }) });
    check("fence gate: a player facing west opens it without turning it", state(block, "minecraft:cardinal_direction") === "south" && state(block, "tofucraft:open") === 1);
    gate.onRedstoneUpdate({ block, powerLevel: 0, previousPowerLevel: 1 });
    check("fence gate: follows redstone", state(block, "tofucraft:open") === 0);
});

// ---------- construction blocks: torches and slabs ----------
scenario("torches", () => {
    const torch = blocks.get("tofucraft:torch");
    const dimension = new FakeDimension();
    dimension.set({ x: 0, y: 63, z: 0 }, "minecraft:stone");
    const onStone = { block: dimension.getBlock({ x: 0, y: 64, z: 0 }), dimension, face: mc.Direction.Up, cancel: false };
    torch.beforeOnPlayerPlace(onStone);
    check("torch: stands on stone", !onStone.cancel);
    dimension.set({ x: 0, y: 64, z: 1 }, "tofucraft:kinu_tofu_torch", { "minecraft:block_face": "up" });
    const onTorch = { block: dimension.getBlock({ x: 0, y: 64, z: 0 }), dimension, face: mc.Direction.North, cancel: false };
    torch.beforeOnPlayerPlace(onTorch);
    check("torch: cannot hang on another torch", onTorch.cancel === true);
    const lit = dimension.set({ x: 5, y: 64, z: 5 }, "tofucraft:kinu_tofu_torch", { "minecraft:block_face": "north" });
    torch.onTick({ block: lit, dimension });
    check("torch: smoke and flame each tick", dimension.particles.join() === "minecraft:basic_smoke_particle,minecraft:basic_flame_particle");
});
scenario("grilled slab", () => {
    const grilled = blocks.get("tofucraft:grilled_slab");
    const dimension = new FakeDimension();
    const perm = new FakePermutation("tofucraft:grilled_tofu_slab", { "minecraft:vertical_half": "bottom", "tofucraft:double": 0, "tofucraft:grilled_face": 0 });
    const low = { block: dimension.getBlock({ x: 0, y: 64, z: 0 }), dimension, player: makePlayer({ dimension, location: { x: 0, y: 64, z: 2 } }), permutationToPlace: perm };
    grilled.beforeOnPlayerPlace(low);
    check("grilled slab: grilled side up when placed at the player's feet", low.permutationToPlace.getState("tofucraft:grilled_face") === 0);
    const high = { block: dimension.getBlock({ x: 0, y: 66, z: 0 }), dimension, player: makePlayer({ dimension, location: { x: 0, y: 64, z: 2 } }), permutationToPlace: perm };
    grilled.beforeOnPlayerPlace(high);
    check("grilled slab: grilled side down when placed above them", high.permutationToPlace.getState("tofucraft:grilled_face") === 1);
});
scenario("slab merging", () => {
    const dimension = new FakeDimension();
    const slab = "tofucraft:momen_tofu_slab";
    const bottom = dimension.set({ x: 0, y: 64, z: 0 }, slab, { "minecraft:vertical_half": "bottom", "tofucraft:double": 0 });
    const player = makePlayer({ held: new mc.ItemStack(slab, 2), dimension });
    const use = (block, blockFace, faceY, who = player, held = who.mainhand) => {
        const event = { block, blockFace, faceLocation: { x: 0.5, y: faceY, z: 0.5 }, itemStack: held, player: who, cancel: false, isFirstEvent: true };
        mc.dispatch("world.beforeEvents.playerInteractWithBlock", event);
        flush();
        return event;
    };
    const down = use(bottom, mc.Direction.Down, 0);
    check("slab: using the bottom face of a bottom slab places normally", !down.cancel && state(bottom, "tofucraft:double") === 0);
    const up = use(bottom, mc.Direction.Up, 0.5);
    check("slab: using the top of a bottom slab makes a double slab", up.cancel && state(bottom, "tofucraft:double") === 1);
    check("slab: it uses up one slab", player.mainhand?.amount === 1 && dimension.sounds.at(-1) === "use.snow");
    const top = dimension.set({ x: 3, y: 64, z: 0 }, slab, { "minecraft:vertical_half": "top", "tofucraft:double": 0 });
    top.setWaterlogged(true);
    const builder = makePlayer({ held: new mc.ItemStack(slab, 1), gameMode: mc.GameMode.Creative, dimension });
    use(top, mc.Direction.Down, 0, builder);
    check("slab: using the underside of a top slab fills it; water leaves; creative keeps the slab", state(top, "tofucraft:double") === 1 && !top.isWaterlogged && builder.mainhand?.amount === 1);
    const side = dimension.set({ x: 6, y: 64, z: 0 }, slab, { "minecraft:vertical_half": "bottom", "tofucraft:double": 0 });
    const wall = dimension.set({ x: 7, y: 64, z: 0 }, "minecraft:stone");
    const lowSide = use(wall, mc.Direction.West, 0.25, makePlayer({ held: new mc.ItemStack(slab, 4), dimension }));
    check("slab: aiming at the lower half beside a bottom slab does not merge", !lowSide.cancel && state(side, "tofucraft:double") === 0);
    const highSide = use(wall, mc.Direction.West, 0.75, makePlayer({ held: new mc.ItemStack(slab, 4), dimension }));
    check("slab: aiming at the upper half beside a bottom slab fills it", highSide.cancel && state(side, "tofucraft:double") === 1);
    const other = dimension.set({ x: 9, y: 64, z: 0 }, "tofucraft:kinu_tofu_slab", { "minecraft:vertical_half": "bottom", "tofucraft:double": 0 });
    const mixed = use(other, mc.Direction.Up, 0.5, makePlayer({ held: new mc.ItemStack(slab, 4), dimension }));
    check("slab: a different tofu slab does not merge", !mixed.cancel && state(other, "tofucraft:double") === 0);
});

console.log(`smoke test: ${passes} passed, ${failures} failed (mocked @minecraft/server, not tested in game)`);
process.exitCode = failures ? 1 : 0;
