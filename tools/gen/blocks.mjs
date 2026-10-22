// Generates the blocks from data: tofu blocks, crops, soy milk fluids, tofu farmland, falling blocks, the salt pan and
// (construction.mjs) the construction blocks, with their loot tables, models, sounds (RP blocks.json), terrain
// textures, flipbooks, language keys and catalog groups.
// The files it writes are generated: change the data here (or in data/) and rerun  node tools/gen/blocks.mjs
import path from "node:path";
import { BP, RP, writeJson, readJson, mergeAtlas, mergeBlocksJson, mergeFlipbooks, mergeLang, report } from "./lib.mjs";
import { TOFU_MATERIALS, TOFU_BEHAVIOUR, blockIdOf, itemIdOf } from "./data/tofu-materials.mjs";
import { GROUPS, generateConstruction } from "./construction.mjs";

const FORMAT = "1.26.50";
const TOFU_GROUP = "tofucraft:itemGroup.name.tofu_block";
const EQUIPMENT_GROUP = "tofucraft:itemGroup.name.equipment";
const short = id => id.replace("tofucraft:", "");
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
// Integer block state. The official 1.26.20 schema only accepts string arrays or a "values" range, so no plain number arrays.
const intState = (min, max) => ({ values: { min, max } });

const sounds = {};
const atlas = {};
const flipbooks = [];

function block(id, { menu, states, traits, components, permutations }) {
    const description = { identifier: id, menu_category: menu };
    if (states) description.states = states;
    if (traits) description.traits = traits;
    const body = { description, components };
    if (permutations?.length) body.permutations = permutations;
    return { format_version: FORMAT, "minecraft:block": body };
}
function writeBlock(dir, id, doc) {
    writeJson(path.join(BP, "blocks", dir, `${short(id)}.json`), doc);
}
function writeLoot(rel, pools) {
    writeJson(path.join(BP, rel), { pools });
    return rel.split(path.sep).join("/");
}
const itemEntry = (name, count) => {
    const entry = { type: "item", name, weight: 1 };
    if (count !== undefined && count !== 1) entry.functions = [{ function: "set_count", count }];
    return entry;
};
const pool = (name, count) => ({ rolls: 1, entries: [itemEntry(name, count)] });
/** Java's "3 more tries at p each" bonus as three independent pools, which is exactly Binomial(3, p). */
const bonusPools = (name, p) => range(1, 3).map(() => ({ rolls: 1, conditions: [{ condition: "random_chance", chance: Math.round(p * 10000) / 10000 }], entries: [itemEntry(name)] }));

// ---------------------------------------------------------------- tofu blocks
for (const m of TOFU_MATERIALS) {
    const id = blockIdOf(m);
    const behaviour = TOFU_BEHAVIOUR[m.key];
    const texture = short(id);
    atlas[texture] = { textures: `textures/blocks/${m.texture}` };
    sounds[id] = { sound: m.sound };
    const tags = [m.tool === "pickaxe" ? "minecraft:is_pickaxe_item_destructible" : "minecraft:is_shovel_item_destructible"];
    if (m.requiresTool) tags.push("minecraft:stone_tier_destructible");
    const instance = { texture };
    if (m.translucent) instance.render_method = "blend";
    const components = {
        "minecraft:material_instances": { "*": instance },
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:destructible_by_mining": { seconds_to_destroy: m.hardness },
        "minecraft:destructible_by_explosion": { explosion_resistance: m.resistance },
        "minecraft:map_color": m.map,
        "minecraft:loot": writeLoot(path.join("loot_tables/blocks/tofu", `${short(id)}.json`), [pool(itemIdOf(m), 4)]),
        "minecraft:tags": tags,
        // Java isNormalCube: full tofu blocks carry redstone power like stone (Bedrock custom blocks default to not).
        "minecraft:redstone_conductivity": { redstone_conductor: true },
    };
    if (m.light) components["minecraft:light_emission"] = m.light;
    if (m.translucent) components["minecraft:light_dampening"] = 2;
    if (behaviour) components[behaviour.component] = {};
    if (behaviour?.fallOn) components["minecraft:entity_fall_on"] = { min_fall_distance: 0.5 };
    let traits, permutations;
    if (m.sideTexture) {
        // Grilled tofu: one grilled face that points at the player who placed it (Java determineOrientation).
        const side = short(blockIdOf(TOFU_MATERIALS.find(t => t.key === "momen")));
        components["minecraft:material_instances"] = { "*": { texture: side } };
        traits = { "minecraft:placement_direction": { enabled_states: ["minecraft:facing_direction"] } };
        const toward = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };
        permutations = Object.entries(toward).map(([facing, face]) => ({
            condition: `q.block_state('minecraft:facing_direction') == '${facing}'`,
            components: { "minecraft:material_instances": { "*": { texture: side }, [face]: { texture } } },
        }));
    }
    writeBlock("tofu/finish", id, block(id, {
        menu: { category: "construction", group: TOFU_GROUP },
        states: behaviour ? { [behaviour.state]: intState(0, 7) } : undefined,
        traits,
        components,
        permutations,
    }));
}

// ---------------------------------------------------------------- falling blocks
const FALLING_TICK = { interval_range: [10, 10], looping: true };
atlas.salt_block = { textures: "textures/blocks/blockSalt" };
writeBlock("misc", "tofucraft:minced_tofu_block", block("tofucraft:minced_tofu_block", {
    menu: { category: "construction", group: TOFU_GROUP },
    components: {
        "minecraft:material_instances": { "*": { texture: "blocktofuminced" } },
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:destructible_by_mining": { seconds_to_destroy: 0.4 },
        "minecraft:destructible_by_explosion": { explosion_resistance: 0.4 },
        "minecraft:map_color": "#C7C7C7",
        "minecraft:loot": writeLoot("loot_tables/blocks/misc/minced_tofu_block.json", [pool("tofucraft:minced_tofu", 4)]),
        "minecraft:tags": ["minecraft:is_shovel_item_destructible"],
        "minecraft:redstone_conductivity": { redstone_conductor: true },
        "minecraft:tick": FALLING_TICK,
        "tofucraft:falling": {},
    },
}));
sounds["tofucraft:minced_tofu_block"] = { sound: "snow" };
writeBlock("misc", "tofucraft:salt_block", block("tofucraft:salt_block", {
    menu: { category: "construction" },
    components: {
        "minecraft:material_instances": { "*": { texture: "salt_block" } },
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:destructible_by_mining": { seconds_to_destroy: 0.5 },
        "minecraft:destructible_by_explosion": { explosion_resistance: 0.5 },
        "minecraft:map_color": "#F7E9A3",
        "minecraft:loot": writeLoot("loot_tables/blocks/misc/salt_block.json", [pool("tofucraft:salt_block")]),
        "minecraft:tags": ["minecraft:is_shovel_item_destructible"],
        "minecraft:redstone_conductivity": { redstone_conductor: true },
        "minecraft:tick": FALLING_TICK,
        "tofucraft:falling": {},
    },
}));
sounds["tofucraft:salt_block"] = { sound: "sand" };

// ---------------------------------------------------------------- tofu farmland
writeBlock("misc", "tofucraft:tofu_farmland", block("tofucraft:tofu_farmland", {
    menu: { category: "none" },
    states: { "tofucraft:moisture": intState(0, 7) },
    components: {
        "minecraft:geometry": "geometry.tofucraft.farmland",
        "minecraft:material_instances": { "*": { texture: "momen_tofu_block" }, top: { texture: "tofufarmland_dry" } },
        "minecraft:selection_box": { origin: [-8, 0, -8], size: [16, 15, 16] },
        "minecraft:destructible_by_mining": { seconds_to_destroy: 0.4 },
        "minecraft:destructible_by_explosion": { explosion_resistance: 0.4 },
        "minecraft:map_color": "#C7C7C7",
        "minecraft:loot": writeLoot("loot_tables/blocks/misc/tofu_farmland.json", [pool("tofucraft:momen_tofu", 4)]),
        "minecraft:tags": ["minecraft:is_shovel_item_destructible"],
        "minecraft:entity_fall_on": { min_fall_distance: 0.5 },
        "tofucraft:tofu_farmland": {},
    },
    permutations: [{
        condition: "q.block_state('tofucraft:moisture') > 0",
        components: { "minecraft:material_instances": { "*": { texture: "momen_tofu_block" }, top: { texture: "tofufarmland_wet" } } },
    }],
}));
sounds["tofucraft:tofu_farmland"] = { sound: "snow" };

// ---------------------------------------------------------------- crops
const WOOL = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"].map(c => `minecraft:${c}_wool`);
for (let i = 0; i < 4; i++) atlas[`soybean_hell_${i}`] = { textures: `textures/blocks/soybeanHell_${i}` };
const CROPS = [
    {
        id: "tofucraft:soybean_crop", geometry: "geometry.tofucraft.crop", soil: ["minecraft:farmland", "tofucraft:tofu_farmland"],
        textures: ["soybean_0", "soybean_0", "soybean_1", "soybean_1", "soybean_2", "soybean_3", "soybean_3", "soybean_4"],
        loot: [
            { stages: [0, 4], name: "young", pools: [pool("tofucraft:soybeans")] },
            { stages: [5, 5], name: "5", pools: [pool("tofucraft:edamame"), ...bonusPools("tofucraft:edamame", 6 / 15)] },
            { stages: [6, 6], name: "6", pools: [pool("tofucraft:edamame"), ...bonusPools("tofucraft:edamame", 7 / 15)] },
            { stages: [7, 7], name: "mature", pools: [pool("tofucraft:soybeans"), ...bonusPools("tofucraft:soybeans", 8 / 15)] },
        ],
    },
    {
        id: "tofucraft:sesame_crop", geometry: "minecraft:geometry.cross", soil: ["minecraft:farmland"],
        textures: ["sesame_0", "sesame_0", "sesame_1", "sesame_1", "sesame_2", "sesame_2", "sesame_3", "sesame_3"],
        loot: [
            { stages: [0, 6], name: "young", pools: [pool("tofucraft:sesame")] },
            { stages: [7, 7], name: "mature", pools: [pool("tofucraft:sesame"), ...bonusPools("tofucraft:sesame", 8 / 15)] },
        ],
    },
    {
        id: "tofucraft:sprouts_crop", geometry: "minecraft:geometry.cross", soil: WOOL,
        textures: ["sprouts_0", "sprouts_0", "sprouts_1", "sprouts_1", "sprouts_2", "sprouts_2", "sprouts_3", "sprouts_3"],
        loot: [
            { stages: [0, 1], name: "young", pools: [pool("tofucraft:soybeans")] },
            { stages: [2, 6], name: "growing", pools: [pool("tofucraft:sprouts")] },
            { stages: [7, 7], name: "mature", pools: [pool("tofucraft:sprouts", 2), ...bonusPools("tofucraft:soybeans", 8 / 15)] },
        ],
    },
    {
        id: "tofucraft:hell_soybean_crop", geometry: "geometry.tofucraft.crop", soil: ["minecraft:soul_sand"],
        textures: ["soybean_hell_0", "soybean_hell_0", "soybean_hell_1", "soybean_hell_1", "soybean_hell_2", "soybean_hell_2", "soybean_hell_3", "soybean_hell_3"],
        loot: [
            { stages: [0, 6], name: "young", pools: [pool("tofucraft:hell_soybeans")] },
            { stages: [7, 7], name: "mature", pools: [pool("tofucraft:hell_soybeans"), ...bonusPools("tofucraft:hell_soybeans", 8 / 15)] },
        ],
    },
];
const plantInstance = texture => ({ "*": { texture, render_method: "alpha_test", ambient_occlusion: 0 } });
const stageCondition = ([from, to]) => from === to ? `q.block_state('tofucraft:growth') == ${from}` : `q.block_state('tofucraft:growth') >= ${from} && q.block_state('tofucraft:growth') <= ${to}`;
for (const crop of CROPS) {
    const permutations = [];
    // One permutation per run of stages that share a texture.
    for (let s = 0; s < 8;) {
        let e = s;
        while (e + 1 < 8 && crop.textures[e + 1] === crop.textures[s]) e++;
        permutations.push({ condition: stageCondition([s, e]), components: { "minecraft:material_instances": plantInstance(crop.textures[s]) } });
        s = e + 1;
    }
    for (const l of crop.loot) {
        const rel = writeLoot(path.join("loot_tables/blocks/crop", `${short(crop.id)}_${l.name}.json`), l.pools);
        permutations.push({ condition: stageCondition(l.stages), components: { "minecraft:loot": rel } });
    }
    writeBlock("crop", crop.id, block(crop.id, {
        menu: { category: "none" },
        states: { "tofucraft:growth": intState(0, 7) },
        components: {
            "minecraft:geometry": crop.geometry,
            "minecraft:material_instances": plantInstance(crop.textures[0]),
            "minecraft:collision_box": false,
            "minecraft:selection_box": { origin: [-8, 0, -8], size: [16, 4, 16] },
            "minecraft:destructible_by_mining": { seconds_to_destroy: 0 },
            "minecraft:destructible_by_explosion": { explosion_resistance: 0 },
            "minecraft:light_dampening": 0,
            "minecraft:placement_filter": { conditions: [{ allowed_faces: ["up"], block_filter: crop.soil }] },
            "minecraft:map_color": "#007C00",
            [crop.id]: {},
        },
        permutations,
    }));
    sounds[crop.id] = { sound: "grass" };
}

// ---------------------------------------------------------------- static fluids (Bedrock has no custom fluids)
atlas.soymilk_hell = { textures: "textures/blocks/soymilkHell" };
atlas.nigari_fluid = { textures: "textures/blocks/nigari" };
for (const tile of ["soymilk", "soymilk_hell", "soysauce", "nigari_fluid"]) {
    flipbooks.push({ flipbook_texture: atlas[tile]?.textures ?? `textures/blocks/${tile}`, atlas_tile: tile, ticks_per_frame: 2 });
}
const emptyLoot = writeLoot("loot_tables/empty.json", []);
const FLUIDS = [
    { id: "tofucraft:soy_milk_fluid", texture: "soymilk", map: "#EFEEDF", params: { bucket: "tofucraft:soy_milk_bucket", nigari: "tofucraft:kinu_tofu_block" } },
    { id: "tofucraft:hell_soy_milk_fluid", texture: "soymilk_hell", map: "#9C3A2E", params: { bucket: "tofucraft:hell_soy_milk_bucket", nigari: "tofucraft:hell_tofu_block" } },
    { id: "tofucraft:soy_sauce_fluid", texture: "soysauce", map: "#432709", params: { bucket: "tofucraft:soy_sauce_bucket" } },
];
for (const fluid of FLUIDS) {
    writeBlock("fluid", fluid.id, block(fluid.id, {
        menu: { category: "none" },
        components: {
            "minecraft:geometry": { identifier: "geometry.tofucraft.fluid", culling: "tofucraft:culling.fluid" },
            "minecraft:material_instances": { "*": { texture: fluid.texture, render_method: "blend", ambient_occlusion: 0 } },
            "minecraft:collision_box": false,
            "minecraft:selection_box": { origin: [-8, 0, -8], size: [16, 14, 16] },
            "minecraft:destructible_by_mining": false,
            "minecraft:destructible_by_explosion": false,
            "minecraft:light_dampening": 2,
            "minecraft:replaceable": {},
            "minecraft:movable": { movement_type: "popped" },
            "minecraft:loot": emptyLoot,
            "minecraft:map_color": fluid.map,
            "tofucraft:fluid": fluid.params,
        },
    }));
}

// ---------------------------------------------------------------- salt pan
atlas.tofucraft_planks_oak = { textures: "textures/blocks/planks_oak" };
atlas.tofucraft_cobblestone = { textures: "textures/blocks/cobblestone" };
const panInstances = content => ({ "*": { texture: "tofucraft_planks_oak" }, base: { texture: "tofucraft_cobblestone" }, content });
const connect = dir => `tofucraft:connect_${dir}`;
writeBlock("misc", "tofucraft:salt_pan", block("tofucraft:salt_pan", {
    menu: { category: "items", group: EQUIPMENT_GROUP },
    // pan_state: 0 empty, 1-3 water evaporating, 4 salt, 5 bittern (Java meta 0, 1-3, 4, 8)
    states: { "tofucraft:pan_state": intState(0, 5), ...Object.fromEntries(["north", "east", "south", "west"].map(d => [connect(d), intState(0, 1)])) },
    components: {
        "minecraft:geometry": {
            identifier: "geometry.tofucraft.salt_pan",
            bone_visibility: {
                ...Object.fromEntries(["north", "east", "south", "west"].map(d => [`frame_${d}`, `q.block_state('${connect(d)}') == 0`])),
                content: "q.block_state('tofucraft:pan_state') > 0",
            },
        },
        "minecraft:material_instances": panInstances({ texture: "still_water_grey", tint_method: "water", render_method: "blend" }),
        "minecraft:collision_box": { origin: [-8, 0, -8], size: [16, 6, 16] },
        "minecraft:selection_box": { origin: [-8, 0, -8], size: [16, 6, 16] },
        "minecraft:destructible_by_mining": { seconds_to_destroy: 0.2 },
        "minecraft:destructible_by_explosion": { explosion_resistance: 0.2 },
        "minecraft:light_dampening": 0,
        "minecraft:placement_filter": { conditions: [{ allowed_faces: ["up"] }] },
        "minecraft:map_color": "#8F7748",
        "minecraft:loot": writeLoot("loot_tables/blocks/misc/salt_pan.json", [pool("tofucraft:salt_pan")]),
        "minecraft:tags": ["minecraft:is_axe_item_destructible"],
        "tofucraft:salt_pan": {},
    },
    permutations: [
        { condition: "q.block_state('tofucraft:pan_state') == 4", components: { "minecraft:material_instances": panInstances({ texture: "salt_block" }) } },
        { condition: "q.block_state('tofucraft:pan_state') == 5", components: { "minecraft:material_instances": panInstances({ texture: "nigari_fluid", render_method: "blend" }) } },
    ],
}));
sounds["tofucraft:salt_pan"] = { sound: "wood" };

// ---------------------------------------------------------------- construction blocks
const constructionLang = generateConstruction({ block, writeBlock, writeLoot, pool, atlas, sounds, emptyLoot });

// ---------------------------------------------------------------- resource pack registries, language, catalog
mergeAtlas(path.join(RP, "textures/terrain_texture.json"), atlas);
mergeBlocksJson(sounds);
mergeFlipbooks(flipbooks);
const rename = {
    "tile.tofucraft:soybeans.name": "tile.tofucraft:soybean_crop.name",
    "tile.tofucraft:hell_soybeans.name": "tile.tofucraft:hell_soybean_crop.name",
    "tile.tofucraft:sesame.name": "tile.tofucraft:sesame_crop.name",
    "tile.tofucraft:sprouts.name": "tile.tofucraft:sprouts_crop.name",
    "tile.tofucraft:soy_milk.name": "tile.tofucraft:soy_milk_fluid.name",
    "tile.tofucraft:hell_soy_milk.name": "tile.tofucraft:hell_soy_milk_fluid.name",
    "tile.tofucraft:soy_sauce.name": "tile.tofucraft:soy_sauce_fluid.name",
};
mergeLang("zh_CN", { [TOFU_GROUP]: "豆腐工艺：豆腐块", ...constructionLang.zh_CN }, rename);
mergeLang("en_US", { [TOFU_GROUP]: "TofuCraft: Tofu Blocks", ...constructionLang.en_US }, rename);

const catalogFile = path.join(BP, "item_catalog/crafting_item_catalog.json");
const catalog = readJson(catalogFile);
const categories = catalog["minecraft:crafting_items_catalog"].categories;
function ensureGroup(categoryName, name, icon) {
    let category = categories.find(c => c.category_name === categoryName);
    if (!category) categories.push(category = { category_name: categoryName, groups: [] });
    if (!category.groups.some(g => g.group_identifier?.name === name)) category.groups.push({ group_identifier: { icon, name }, items: [] });
}
ensureGroup("construction", TOFU_GROUP, "tofucraft:kinu_tofu_block");
for (const kind of ["stairs", "slab", "wall", "fence_gate", "trapdoor", "door"]) ensureGroup("construction", GROUPS[kind], `tofucraft:kinu_tofu_${kind}`);
ensureGroup("items", EQUIPMENT_GROUP, "tofucraft:salt_pan");
ensureGroup("items", GROUPS.torch, "tofucraft:kinu_tofu_torch");
writeJson(catalogFile, catalog, { indent: 3 });

const changed = report();
console.log(`blocks generator: ${changed.length} file(s) written`);
for (const f of changed) console.log(`  ${f}`);
