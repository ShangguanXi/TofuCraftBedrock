// Node smoke test for the behavior pack scripts (mocked @minecraft/server, not the real game).
// Run from the repo root: node --import ./tools/test/loader.mjs tools/test/smoke-test.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as mc from "./mock-server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BP = path.join(ROOT, "tofucraft[B]");
let failures = 0, passes = 0;
function check(name, condition, detail = "") {
    if (condition) passes++;
    else { failures++; console.log(`FAIL ${name}${detail ? ` - ${detail}` : ""}`); }
}

// ---------- a tiny block world ----------
const TAGS = {
    "minecraft:stone": ["stone", "minecraft:is_pickaxe_item_destructible"],
    "minecraft:cobblestone": ["stone", "minecraft:is_pickaxe_item_destructible"],
    "minecraft:iron_block": ["metal", "minecraft:is_pickaxe_item_destructible"],
    "minecraft:oak_planks": ["wood", "minecraft:is_axe_item_destructible"],
    "minecraft:dirt": ["dirt", "minecraft:is_shovel_item_destructible"],
    "minecraft:glass": [],
    "tofucraft:kinu_tofu_block": ["minecraft:is_shovel_item_destructible"],
    "tofucraft:momen_tofu_block": ["minecraft:is_shovel_item_destructible"],
    "tofucraft:ishi_tofu_block": ["minecraft:stone_tier_destructible", "minecraft:is_pickaxe_item_destructible"],
    "tofucraft:metal_tofu_block": ["minecraft:stone_tier_destructible", "minecraft:is_pickaxe_item_destructible"],
};
class FakeDimension {
    constructor({ biome = "minecraft:plains", biomeTags = [] } = {}) {
        this.blocks = new Map();
        this.spawned = [];
        this.biome = { id: biome, hasTags: tags => tags.some(t => biomeTags.includes(t)) };
    }
    key(l) { return `${l.x},${l.y},${l.z}`; }
    set(l, typeId) { if (typeId === "minecraft:air") this.blocks.delete(this.key(l)); else this.blocks.set(this.key(l), typeId); }
    getBlock(l) { return new FakeBlock(this, { x: l.x, y: l.y, z: l.z }); }
    spawnItem(stack) { this.spawned.push({ typeId: stack.typeId, amount: stack.amount }); }
    getTopmostBlock({ x, z }) {
        for (let y = 320; y >= -64; y--) if (this.blocks.has(this.key({ x, y, z }))) return this.getBlock({ x, y, z });
        return undefined;
    }
    getBiome() { return this.biome; }
}
class FakeBlock {
    constructor(dimension, location) { this.dimension = dimension; this.location = location; }
    get x() { return this.location.x; }
    get y() { return this.location.y; }
    get z() { return this.location.z; }
    get typeId() { return this.dimension.blocks.get(this.dimension.key(this.location)) ?? "minecraft:air"; }
    get isAir() { return this.typeId === "minecraft:air"; }
    get isLiquid() { return false; }
    get isSolid() { return !this.isAir && this.typeId !== "minecraft:torch"; }
    hasTag(tag) { return (TAGS[this.typeId] ?? []).includes(tag); }
    above(n = 1) { return this.dimension.getBlock({ ...this.location, y: this.location.y + n }); }
    below(n = 1) { return this.dimension.getBlock({ ...this.location, y: this.location.y - n }); }
    setType(typeId) { this.dimension.set(this.location, typeId); }
    center() { return { x: this.x + 0.5, y: this.y + 0.5, z: this.z + 0.5 }; }
}
/** Builds a column: blocks listed bottom to top, the tested block at `at` (y). */
function column(stack, options = {}, at = 64) {
    const dimension = new FakeDimension(options);
    const base = at - stack.indexOf(stack.find(s => s.startsWith("*")));
    stack.forEach((typeId, i) => dimension.set({ x: 0, y: base + i, z: 0 }, typeId.replace("*", "")));
    return { dimension, block: dimension.getBlock({ x: 0, y: at, z: 0 }) };
}
function withRandom(value, fn) {
    const original = Math.random;
    Math.random = () => value;
    try { return fn(); } finally { Math.random = original; }
}

// ---------- load the pack like the game: early execution, then startup ----------
try {
    await import(pathToFileURL(path.join(BP, "scripts/main.js")).href);
    check("scripts load in early execution", true);
} catch (e) {
    check("scripts load in early execution", false, e.message);
}
mc.dispatch("system.beforeEvents.startup", mc.makeStartupEvent());
mc.state.earlyExecution = false;

const components = mc.registered.block;
for (const name of ["tofucraft:kinu_tofu_block", "tofucraft:momen_tofu_block", "tofucraft:ishi_tofu_block"]) {
    check(`component ${name} registered`, components.has(name));
}
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const file of walk(path.join(BP, "blocks")).filter(f => f.endsWith(".json"))) {
    const c = JSON.parse(fs.readFileSync(file, "utf8"))["minecraft:block"].components;
    for (const key of Object.keys(c).filter(k => k.startsWith("tofucraft:"))) check(`${path.basename(file)} uses registered ${key}`, components.has(key));
}
check("Tofu World registered as tofucraft:tofu_world", JSON.stringify(mc.registered.dimensions) === JSON.stringify(["tofucraft:tofu_world"]), JSON.stringify(mc.registered.dimensions));
check("no item pickup hook (debug teleport removed)", !mc.subscriptions.has("world.beforeEvents.entityItemPickup"));

const kinu = components.get("tofucraft:kinu_tofu_block");
const momen = components.get("tofucraft:momen_tofu_block");
const ishi = components.get("tofucraft:ishi_tofu_block");

/** Runs one scenario; an exception counts as a failure instead of stopping the test. */
function scenario(fn) {
    try { fn(); } catch (e) { failures++; console.log(`FAIL scenario threw: ${e.message}`); }
}

// ---------- kinu: falling on it ----------
scenario(() => {
    const { dimension, block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"]);
    withRandom(0, () => kinu.onEntityFallOn({ block, entity: new mc.Player(), fallDistance: 1.25 }));
    check("kinu: player falling 1.25 crushes it", block.isAir);
    check("kinu: crushed kinu drops tofucraft:kinu_tofu x4 when every 40% roll succeeds",
        JSON.stringify(dimension.spawned) === JSON.stringify([{ typeId: "tofucraft:kinu_tofu", amount: 4 }]), JSON.stringify(dimension.spawned));
});
scenario(() => {
    const { dimension, block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"]);
    withRandom(0.99, () => kinu.onEntityFallOn({ block, entity: new mc.Player(), fallDistance: 2 }));
    check("kinu: failed drop rolls leave nothing", block.isAir && dimension.spawned.length === 0);
});
scenario(() => {
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"]);
    kinu.onEntityFallOn({ block, entity: new mc.Player(), fallDistance: 0.4 });
    check("kinu: falling 0.4 does nothing", block.typeId === "tofucraft:kinu_tofu_block");
});
scenario(() => {
    mc.state.gameRules.mobGriefing = false;
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"]);
    kinu.onEntityFallOn({ block, entity: new mc.Entity("minecraft:zombie"), fallDistance: 3 });
    check("kinu: mobs do not crush it with mobGriefing off", block.typeId === "tofucraft:kinu_tofu_block");
    mc.state.gameRules.mobGriefing = true;
    kinu.onEntityFallOn({ block, entity: new mc.Entity("minecraft:zombie"), fallDistance: 3 });
    check("kinu: mobs crush it with mobGriefing on", block.isAir);
});

// ---------- kinu: random ticks ----------
scenario(() => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:kinu_tofu_block", "minecraft:stone"]);
    withRandom(0.99, () => kinu.onRandomTick({ block }));
    check("kinu: stone on top of planks crushes it", block.isAir);
});
scenario(() => {
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block", "minecraft:stone"]);
    withRandom(0, () => kinu.onRandomTick({ block }));
    check("kinu: dirt is no firm base, so no crushing", block.typeId === "tofucraft:kinu_tofu_block");
});
scenario(() => {
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"], { biome: "minecraft:ice_plains" });
    withRandom(0, () => kinu.onRandomTick({ block }));
    check("kinu: freezes into dried tofu on the surface of a cold biome", block.typeId === "tofucraft:dried_tofu_block");
});
scenario(() => {
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"], { biome: "minecraft:plains" });
    withRandom(0, () => kinu.onRandomTick({ block }));
    check("kinu: does not freeze in plains", block.typeId === "tofucraft:kinu_tofu_block");
});
scenario(() => {
    const stack = ["minecraft:dirt", "*tofucraft:kinu_tofu_block", "minecraft:glass", ...Array(20).fill("minecraft:dirt")];
    const { block } = column(stack, { biome: "minecraft:ice_plains" });
    withRandom(0, () => kinu.onRandomTick({ block }));
    check("kinu: needs air above to freeze", block.typeId === "tofucraft:kinu_tofu_block");
});
scenario(() => {
    // Air above, but 20 blocks of ground stacked higher up the column: more than 9 below the surface.
    const dimension = new FakeDimension({ biome: "minecraft:ice_plains" });
    dimension.set({ x: 0, y: 64, z: 0 }, "tofucraft:kinu_tofu_block");
    dimension.set({ x: 0, y: 84, z: 0 }, "minecraft:dirt");
    const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
    withRandom(0, () => kinu.onRandomTick({ block }));
    check("kinu: does not freeze deep below the surface", block.typeId === "tofucraft:kinu_tofu_block");
});
scenario(() => {
    const high = column(["minecraft:stone", "*tofucraft:kinu_tofu_block"], { biome: "minecraft:extreme_hills" }, 100);
    withRandom(0, () => kinu.onRandomTick({ block: high.block }));
    check("kinu: extreme hills (0.2) are cold enough at y=100", high.block.typeId === "tofucraft:dried_tofu_block");
    const low = column(["minecraft:stone", "*tofucraft:kinu_tofu_block"], { biome: "minecraft:extreme_hills" }, 80);
    withRandom(0, () => kinu.onRandomTick({ block: low.block }));
    check("kinu: extreme hills are too warm at y=80", low.block.typeId === "tofucraft:kinu_tofu_block");
});
scenario(() => {
    const { block } = column(["minecraft:dirt", "*tofucraft:kinu_tofu_block"], { biome: "custom:snowland", biomeTags: ["frozen"] });
    withRandom(0, () => kinu.onRandomTick({ block }));
    check("kinu: unknown biomes fall back to the frozen tag", block.typeId === "tofucraft:dried_tofu_block");
});

// ---------- momen / ishi: pressing ----------
scenario(() => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:momen_tofu_block", "minecraft:cobblestone"]);
    withRandom(0, () => momen.onRandomTick({ block }));
    check("momen: pressed by cobblestone hardens into ishi tofu", block.typeId === "tofucraft:ishi_tofu_block");
});
scenario(() => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:momen_tofu_block"]);
    withRandom(0, () => momen.onRandomTick({ block }));
    check("momen: nothing on top, nothing happens", block.typeId === "tofucraft:momen_tofu_block");
});
scenario(() => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:momen_tofu_block", "tofucraft:ishi_tofu_block"]);
    withRandom(0, () => momen.onRandomTick({ block }));
    check("momen: ishi tofu on top is no weight (Java: tofu material)", block.typeId === "tofucraft:momen_tofu_block");
});
scenario(() => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:momen_tofu_block", "minecraft:iron_block"]);
    withRandom(0.5, () => momen.onRandomTick({ block }));
    check("momen: a failed roll keeps it (1/27 per tick)", block.typeId === "tofucraft:momen_tofu_block");
});
scenario(() => {
    const { block } = column(["minecraft:oak_planks", "*tofucraft:ishi_tofu_block"]);
    withRandom(0, () => ishi.onRandomTick({ block }));
    check("ishi: no longer hardens without weight", block.typeId === "tofucraft:ishi_tofu_block");
});
scenario(() => {
    const { block } = column(["minecraft:stone", "*tofucraft:ishi_tofu_block", "tofucraft:metal_tofu_block"]);
    withRandom(0, () => ishi.onRandomTick({ block }));
    check("ishi: pressed by metal tofu hardens into metal tofu", block.typeId === "tofucraft:metal_tofu_block");
});

console.log(`smoke test: ${passes} passed, ${failures} failed (mocked @minecraft/server, not tested in game)`);
process.exitCode = failures ? 1 : 0;
