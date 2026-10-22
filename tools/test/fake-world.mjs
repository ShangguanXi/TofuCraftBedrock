// A small in-memory world for the smoke tests: blocks with states, light, weather, biomes, and players with a main
// hand and an inventory. Only what the pack scripts use is implemented.
import * as mc from "./mock-server.mjs";

// Tags of the vanilla blocks the tests use (Bedrock vanilla block tags), plus the pack's own tofu blocks.
const TAGS = {
    "minecraft:stone": ["stone", "minecraft:is_pickaxe_item_destructible"],
    "minecraft:cobblestone": ["stone", "minecraft:is_pickaxe_item_destructible"],
    "minecraft:iron_block": ["metal", "minecraft:is_pickaxe_item_destructible"],
    "minecraft:oak_planks": ["wood", "minecraft:is_axe_item_destructible"],
    "minecraft:dirt": ["dirt", "minecraft:is_shovel_item_destructible"],
    "minecraft:grass_block": ["grass", "dirt", "minecraft:is_shovel_item_destructible"],
    "tofucraft:kinu_tofu_block": ["minecraft:is_shovel_item_destructible"],
    "tofucraft:momen_tofu_block": ["minecraft:is_shovel_item_destructible"],
    "tofucraft:ishi_tofu_block": ["minecraft:is_pickaxe_item_destructible"],
    "tofucraft:metal_tofu_block": ["minecraft:stone_tier_destructible", "minecraft:is_pickaxe_item_destructible"],
};
const LIQUIDS = new Set(["minecraft:water", "minecraft:flowing_water", "minecraft:lava"]);
const NOT_SOLID = id => id === "minecraft:air" || LIQUIDS.has(id) || /(_crop|_fluid|short_grass|fern|torch|fire)$/.test(id);

export class FakePermutation {
    constructor(typeId, states = {}) { this.typeId = typeId; this.states = states; }
    get type() { return { id: this.typeId }; }
    getState(name) { return this.states[name]; }
    withState(name, value) { return new FakePermutation(this.typeId, { ...this.states, [name]: value }); }
}

export class FakeDimension {
    constructor({ id = "minecraft:overworld", biome = "minecraft:plains", biomeTags = [], weather = mc.WeatherType.Clear, sky = 15, light = 0 } = {}) {
        this.id = id;
        this.blocks = new Map();
        this.waterlogged = new Set();
        this.spawned = [];
        this.sounds = [];
        this.particles = [];
        this.commands = [];
        this.destroyed = [];
        this.weather = weather;
        this.sky = sky;
        this.light = light;
        this.biome = { id: biome, hasTags: tags => tags.some(t => biomeTags.includes(t)) };
    }
    key(l) { return `${l.x},${l.y},${l.z}`; }
    set(l, typeId, states = {}) {
        if (typeId === "minecraft:air") this.blocks.delete(this.key(l));
        else this.blocks.set(this.key(l), new FakePermutation(typeId, states));
        return this.getBlock(l);
    }
    permutationAt(l) { return this.blocks.get(this.key(l)) ?? new FakePermutation("minecraft:air"); }
    getBlock(l) { return new FakeBlock(this, { x: l.x, y: l.y, z: l.z }); }
    getTopmostBlock({ x, z }) {
        for (let y = 320; y >= -64; y--) if (this.blocks.has(this.key({ x, y, z }))) return this.getBlock({ x, y, z });
        return undefined;
    }
    getBiome() { return this.biome; }
    getWeather() { return this.weather; }
    spawnItem(stack, location) { this.spawned.push({ typeId: stack.typeId, amount: stack.amount, location }); }
    playSound(id, location) { this.sounds.push(id); this.soundAt = location; }
    spawnParticle(id) { this.particles.push(id); }
    runCommand(command) {
        this.commands.push(command);
        const m = /^setblock (-?\d+) (-?\d+) (-?\d+) air destroy$/.exec(command);
        if (m) {
            const l = { x: +m[1], y: +m[2], z: +m[3] };
            this.destroyed.push(this.permutationAt(l));
            this.set(l, "minecraft:air");
        }
        return { successCount: 1 };
    }
    /** All items spawned with this id, summed. */
    count(typeId) { return this.spawned.filter(s => s.typeId === typeId).reduce((n, s) => n + s.amount, 0); }
}

export class FakeBlock {
    constructor(dimension, location) { this.dimension = dimension; this.location = location; }
    get x() { return this.location.x; }
    get y() { return this.location.y; }
    get z() { return this.location.z; }
    get permutation() { return this.dimension.permutationAt(this.location); }
    get typeId() { return this.permutation.typeId; }
    get isAir() { return this.typeId === "minecraft:air"; }
    get isLiquid() { return LIQUIDS.has(this.typeId); }
    get isSolid() { return !NOT_SOLID(this.typeId); }
    get isWaterlogged() { return this.dimension.waterlogged.has(this.dimension.key(this.location)); }
    setWaterlogged(value) {
        if (value) this.dimension.waterlogged.add(this.dimension.key(this.location));
        else this.dimension.waterlogged.delete(this.dimension.key(this.location));
    }
    /** Two-part vertical multi-blocks (doors): both parts, bottom first. */
    getParts() {
        const part = this.permutation.getState("minecraft:multi_block_part");
        if (part === undefined) return undefined;
        const bottom = this.below(part);
        return [bottom, bottom.above()];
    }
    hasTag(tag) { return (TAGS[this.typeId] ?? []).includes(tag); }
    offset(v) { return this.dimension.getBlock({ x: this.x + v.x, y: this.y + v.y, z: this.z + v.z }); }
    above(n = 1) { return this.offset({ x: 0, y: n, z: 0 }); }
    below(n = 1) { return this.offset({ x: 0, y: -n, z: 0 }); }
    north(n = 1) { return this.offset({ x: 0, y: 0, z: -n }); }
    south(n = 1) { return this.offset({ x: 0, y: 0, z: n }); }
    east(n = 1) { return this.offset({ x: n, y: 0, z: 0 }); }
    west(n = 1) { return this.offset({ x: -n, y: 0, z: 0 }); }
    getLightLevel() { return Math.max(this.dimension.sky, this.dimension.light); }
    getSkyLightLevel() { return this.dimension.sky; }
    setType(typeId) { this.dimension.set(this.location, typeId); }
    setPermutation(permutation) { this.dimension.set(this.location, permutation.typeId, permutation.states); }
    center() { return { x: this.x + 0.5, y: this.y + 0.5, z: this.z + 0.5 }; }
}

/** A player holding `held` (an ItemStack or undefined), with a simple unlimited inventory. */
export function makePlayer({ held, gameMode = mc.GameMode.Survival, dimension, yaw = 0, location = { x: 0, y: 70, z: 0 } } = {}) {
    const player = new mc.Player();
    player.dimension = dimension;
    player.location = location;
    player.getRotation = () => ({ x: 0, y: yaw });
    player.mainhand = held;
    player.inventory = [];
    player.getGameMode = () => gameMode;
    const equippable = {
        getEquipment: slot => (slot === mc.EquipmentSlot.Mainhand ? player.mainhand : undefined),
        setEquipment: (slot, stack) => { if (slot === mc.EquipmentSlot.Mainhand) player.mainhand = stack; },
    };
    const inventory = { container: { addItem: stack => { player.inventory.push(stack); return undefined; } } };
    player.getComponent = id => (id === "minecraft:equippable" ? equippable : id === "minecraft:inventory" ? inventory : undefined);
    return player;
}

/** An item stack with durability (used by tools). */
export function tool(typeId, maxDurability) {
    const stack = new mc.ItemStack(typeId);
    stack.components["minecraft:durability"] = { damage: 0, maxDurability, getDamageChance: () => 100 };
    return stack;
}

/** Runs `fn` with Math.random returning `value` (a number, or a list consumed in order and then repeated). */
export function withRandom(value, fn) {
    const original = Math.random;
    const values = Array.isArray(value) ? [...value] : [value];
    Math.random = () => (values.length > 1 ? values.shift() : values[0]);
    try { return fn(); } finally { Math.random = original; }
}
