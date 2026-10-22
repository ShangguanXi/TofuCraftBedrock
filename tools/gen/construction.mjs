// Construction blocks of the 17 tofu materials (Java TofuCraft LoaderConstructionBlock): stairs, slabs, walls, fence
// gates, trapdoors, doors and torches, with their models. Numbers come from Java: stairs copy their tofu block, slabs
// share one block per Java slab type (hardness 1.0, shovel, snow sound), everything else uses TofuInfo.setBasicFeature.
// Ladders are not ported yet.
import fs from "node:fs";
import path from "node:path";
import { RP, writeJson } from "./lib.mjs";
import { TOFU_MATERIALS, blockIdOf } from "./data/tofu-materials.mjs";
import * as S from "./shapes.mjs";

export const GROUPS = {
    stairs: "tofucraft:itemGroup.name.stairs",
    slab: "tofucraft:itemGroup.name.slab",
    wall: "tofucraft:itemGroup.name.wall",
    fence_gate: "tofucraft:itemGroup.name.fence_gate",
    trapdoor: "tofucraft:itemGroup.name.trapdoor",
    door: "tofucraft:itemGroup.name.door",
    torch: "tofucraft:itemGroup.name.torch",
};

const short = id => id.replace("tofucraft:", "");
const intState = (min, max) => ({ values: { min, max } });
const texturesDir = path.join(RP, "textures/blocks");
const textureFiles = fs.readdirSync(texturesDir).filter(f => f.endsWith(".png")).map(f => f.slice(0, -4));
/** Texture file (without extension) by case-insensitive name, as the Java names mix cases (tofuTrapdoor_friedPouch). */
function textureFile(name) {
    const found = textureFiles.find(f => f.toLowerCase() === name.toLowerCase());
    if (!found) throw new Error(`missing texture textures/blocks/${name}.png`);
    return found;
}

const javaName = m => m.java ?? m.key;
const idOf = (m, kind) => `tofucraft:${m.item}_${kind}`;
const toolTags = (m, requiresTool) => {
    const tags = [m.tool === "pickaxe" ? "minecraft:is_pickaxe_item_destructible" : "minecraft:is_shovel_item_destructible"];
    if (requiresTool) tags.push("minecraft:stone_tier_destructible");
    return tags;
};
const destructible = (hardness, resistance) => ({
    "minecraft:destructible_by_mining": { seconds_to_destroy: hardness },
    "minecraft:destructible_by_explosion": { explosion_resistance: resistance },
});
const WATERLOGGABLE = { detection_rules: [{ liquid_type: "water", can_contain_liquid: true }] };
const permutation = (condition, components) => ({ condition, components });

/**
 * Writes the construction blocks and their models. `ctx` gives the block helpers of blocks.mjs and the registries it
 * merges afterwards (atlas, sounds). Returns the language keys it needs.
 */
export function generateConstruction({ block, writeBlock, writeLoot, pool, atlas, sounds, emptyLoot }) {
    // ---------------------------------------------------------------- models
    const models = {
        stairs: S.stairsGeometry(),
        slab: S.slabGeometry(),
        wall: S.wallGeometry(),
        fence_gate: S.fenceGateGeometry(),
        trapdoor: S.trapdoorGeometry(),
        door: S.doorGeometry(),
        torch: S.torchGeometry(),
    };
    for (const [kind, bones] of Object.entries(models)) {
        writeJson(path.join(RP, "models/blocks", `tofucraft_${kind}.geo.json`), S.geometry(`geometry.tofucraft.${kind}`, bones), { compact: true, trailingNewline: true });
    }
    const geometryOf = (kind, boneVisibility) => ({ identifier: `geometry.tofucraft.${kind}`, bone_visibility: boneVisibility });
    const stairsVisibility = S.stairsBoneVisibility();
    const wallVisibility = S.wallBoneVisibility();
    const gateVisibility = S.fenceGateBoneVisibility();
    const trapdoorStates = S.trapdoorStates();
    const trapdoorVisibility = Object.fromEntries(trapdoorStates.map(s => [s.bone, s.condition]));
    const doorVisibility = S.doorBoneVisibility();
    const torchVisibility = S.torchBoneVisibility();

    for (const m of TOFU_MATERIALS) {
        const kinu = m.key === "kinu";
        const metal = m.key === "metal";
        const blockTexture = short(blockIdOf(m));
        // Grilled tofu shows its grilled face on top (Java BlockTofuGrilled.getIcon with meta 0) and momen on the sides.
        const faces = m.sideTexture
            ? { "*": { texture: short(blockIdOf(TOFU_MATERIALS.find(t => t.key === "momen"))) }, up: { texture: blockTexture } }
            : { "*": { texture: blockTexture } };
        // Java renders annin tofu walls, gates, trapdoors and doors in the translucent pass; stairs and slabs are opaque.
        const withMethod = (instances, method) => Object.fromEntries(Object.entries(instances).map(([k, v]) => [k, method ? { ...v, render_method: method } : v]));
        const translucent = m.translucent ? "blend" : undefined;
        const fragile = kinu ? { "tofucraft:fragile": {}, "minecraft:entity_fall_on": { min_fall_distance: 0.5 } } : {};
        const light = level => (level ? { "minecraft:light_emission": level } : {});
        const basic = {
            ...destructible(m.hardness, m.resistance),
            "minecraft:map_color": m.map,
            "minecraft:light_dampening": 0,
            ...light(m.light),
        };

        // ---------------------------------------------------------------- stairs
        const stairsId = idOf(m, "stairs");
        writeBlock("construction/stairs", stairsId, block(stairsId, {
            menu: { category: "construction", group: GROUPS.stairs },
            traits: {
                "minecraft:placement_position": { enabled_states: ["minecraft:vertical_half"] },
                "minecraft:placement_direction": {
                    enabled_states: ["minecraft:corner_and_cardinal_direction"],
                    blocks_to_corner_with: [{ tags: "q.any_tag('minecraft:cornerable_stairs', 'tofucraft:stairs')" }],
                },
            },
            components: {
                "minecraft:geometry": geometryOf("stairs", stairsVisibility),
                "minecraft:material_instances": faces,
                ...basic,
                // Java: setLightLevel(1.0F) on glow tofu stairs only
                ...light(m.key === "glow" ? 15 : undefined),
                "minecraft:tags": [...toolTags(m, m.requiresTool), "tofucraft:stairs", "minecraft:cornerable_stairs"],
                "minecraft:support": { shape: "stair" },
                "minecraft:liquid_detection": WATERLOGGABLE,
                ...(kinu ? { "tofucraft:fragile": { weight: true }, "minecraft:entity_fall_on": { min_fall_distance: 0.5 } } : {}),
            },
            permutations: S.stairsCollisions().map(s => permutation(s.condition, { "minecraft:collision_box": s.boxes.map(S.toBox) })),
        }));
        sounds[stairsId] = { sound: m.sound };

        // ---------------------------------------------------------------- slabs
        // Java BlockTofuStep: hardness 1.0 (glow 0.5, grilled resistance 50), shovel, snow sound, cloth map colour.
        const slabId = idOf(m, "slab");
        const slabHardness = m.key === "glow" ? 0.5 : 1.0;
        const slabResistance = m.key === "grilled" ? 30 : slabHardness;
        const grilledSlab = !!m.sideTexture;
        const slabFaces = grilledSlab ? faces : { "*": { texture: blockTexture } };
        const single = writeLoot(path.join("loot_tables/blocks/construction", `${short(slabId)}.json`), [pool(slabId)]);
        const double = writeLoot(path.join("loot_tables/blocks/construction", `${short(slabId)}_double.json`), [pool(slabId, 2)]);
        const slabPermutations = [
            permutation("q.block_state('minecraft:vertical_half') == 'top'", {
                "minecraft:collision_box": S.toBox([0, 8, 0, 16, 16, 16]),
                "minecraft:selection_box": S.toBox([0, 8, 0, 16, 16, 16]),
            }),
            permutation("q.block_state('tofucraft:double') == 1", {
                "minecraft:collision_box": true,
                "minecraft:selection_box": true,
                "minecraft:light_dampening": 15,
                "minecraft:loot": double,
            }),
        ];
        if (grilledSlab) {
            // Java BlockTofuStepFaces: the grilled face is on top when placed from above, else underneath.
            slabPermutations.push(permutation("q.block_state('tofucraft:grilled_face') == 1", {
                "minecraft:material_instances": { "*": faces["*"], down: faces.up },
            }));
        }
        writeBlock("construction/slab", slabId, block(slabId, {
            menu: { category: "construction", group: GROUPS.slab },
            states: { "tofucraft:double": intState(0, 1), ...(grilledSlab ? { "tofucraft:grilled_face": intState(0, 1) } : {}) },
            traits: { "minecraft:placement_position": { enabled_states: ["minecraft:vertical_half"] } },
            components: {
                "minecraft:geometry": geometryOf("slab", {
                    bottom: "q.block_state('tofucraft:double') == 0 && q.block_state('minecraft:vertical_half') == 'bottom'",
                    top: "q.block_state('tofucraft:double') == 0 && q.block_state('minecraft:vertical_half') == 'top'",
                    double: "q.block_state('tofucraft:double') == 1",
                }),
                "minecraft:material_instances": slabFaces,
                "minecraft:collision_box": S.toBox([0, 0, 0, 16, 8, 16]),
                "minecraft:selection_box": S.toBox([0, 0, 0, 16, 8, 16]),
                ...destructible(slabHardness, slabResistance),
                "minecraft:map_color": "#C7C7C7",
                "minecraft:light_dampening": 0,
                ...light(m.key === "glow" ? 14 : undefined),
                "minecraft:loot": single,
                "minecraft:tags": ["minecraft:is_shovel_item_destructible", "tofucraft:slab"],
                "minecraft:liquid_detection": WATERLOGGABLE,
                ...(kinu ? { "tofucraft:fragile": { weight: true }, "minecraft:entity_fall_on": { min_fall_distance: 0.5 } } : {}),
                ...(grilledSlab ? { "tofucraft:grilled_slab": {} } : {}),
            },
            permutations: slabPermutations,
        }));
        sounds[slabId] = { sound: "snow" };

        // ---------------------------------------------------------------- walls
        const wallId = idOf(m, "wall");
        writeBlock("construction/wall", wallId, block(wallId, {
            menu: { category: "construction", group: GROUPS.wall },
            traits: { "minecraft:connection": { enabled_states: ["minecraft:cardinal_connections"] } },
            components: {
                "minecraft:geometry": geometryOf("wall", wallVisibility),
                "minecraft:material_instances": withMethod(faces, translucent),
                ...basic,
                "minecraft:tags": [...toolTags(m, m.requiresTool), "tofucraft:wall"],
                "minecraft:support": { shape: "fence" },
                "minecraft:connection_rule": { accepts_connections_from: "all" },
                "minecraft:liquid_detection": WATERLOGGABLE,
                ...fragile,
            },
            permutations: S.wallShapes().map(s => permutation(s.condition, {
                "minecraft:collision_box": s.collision.map(S.toBox),
                "minecraft:selection_box": S.toBox(s.selection),
            })),
        }));
        sounds[wallId] = { sound: m.sound };

        // ---------------------------------------------------------------- fence gates (Java BlockFenceGate: Material.wood)
        const gateId = idOf(m, "fence_gate");
        writeBlock("construction/fence_gate", gateId, block(gateId, {
            menu: { category: "construction", group: GROUPS.fence_gate },
            states: { "tofucraft:open": intState(0, 1) },
            traits: { "minecraft:placement_direction": { enabled_states: ["minecraft:cardinal_direction"] } },
            components: {
                "minecraft:geometry": geometryOf("fence_gate", gateVisibility),
                "minecraft:material_instances": withMethod(faces, translucent),
                ...basic,
                "minecraft:map_color": "#8F7748",
                "minecraft:tags": [...toolTags(m, false), "tofucraft:fence_gate"],
                "minecraft:liquid_detection": WATERLOGGABLE,
                "minecraft:redstone_consumer": {},
                "tofucraft:fence_gate": {},
                ...fragile,
            },
            permutations: S.fenceGateShapes().flatMap(s => [
                permutation(s.condition, {
                    "minecraft:collision_box": S.toBox(s.collision),
                    "minecraft:selection_box": S.toBox(s.selection),
                    "minecraft:connection_rule": { accepts_connections_from: "all", enabled_directions: s.connect },
                }),
            ]).concat([permutation("q.block_state('tofucraft:open') == 1", { "minecraft:collision_box": false })]),
        }));
        sounds[gateId] = { sound: m.sound };

        // ---------------------------------------------------------------- trapdoors
        const trapdoorId = idOf(m, "trapdoor");
        const trapdoorTexture = `tofuTrapdoor_${javaName(m)}`;
        atlas[textureFile(trapdoorTexture)] = { textures: `textures/blocks/${textureFile(trapdoorTexture)}` };
        writeBlock("construction/trapdoor", trapdoorId, block(trapdoorId, {
            menu: { category: "construction", group: GROUPS.trapdoor },
            states: { "tofucraft:open": intState(0, 1) },
            traits: {
                "minecraft:placement_direction": { enabled_states: ["minecraft:cardinal_direction"] },
                "minecraft:placement_position": { enabled_states: ["minecraft:vertical_half"] },
            },
            components: {
                "minecraft:geometry": geometryOf("trapdoor", trapdoorVisibility),
                "minecraft:material_instances": { "*": { texture: textureFile(trapdoorTexture), render_method: translucent ?? "alpha_test_single_sided" } },
                "minecraft:collision_box": S.toBox(trapdoorStates[0].box),
                "minecraft:selection_box": S.toBox(trapdoorStates[0].box),
                ...basic,
                "minecraft:tags": [...toolTags(m, m.requiresTool), "tofucraft:trapdoor"],
                "minecraft:liquid_detection": WATERLOGGABLE,
                "minecraft:connection_rule": { accepts_connections_from: "none" },
                "minecraft:redstone_consumer": {},
                // Java BlockTrapDoor: Material.iron trapdoors ignore players and follow redstone only.
                [metal ? "tofucraft:redstone_trapdoor" : "tofucraft:trapdoor"]: {},
                ...fragile,
            },
            permutations: trapdoorStates.slice(1).map(s => permutation(s.condition, {
                "minecraft:collision_box": S.toBox(s.box),
                "minecraft:selection_box": S.toBox(s.box),
                ...(s.side ? { "minecraft:connection_rule": { accepts_connections_from: "all", enabled_directions: [s.side] } } : {}),
            })),
        }));
        sounds[trapdoorId] = { sound: m.sound };

        // ---------------------------------------------------------------- doors (two-part multi-block; items in items/.../door)
        const doorId = idOf(m, "door");
        const doorTexture = half => textureFile(`tofudoor_${javaName(m).toLowerCase()}_${half}`);
        for (const half of ["lower", "upper"]) atlas[doorTexture(half)] = { textures: `textures/blocks/${doorTexture(half)}` };
        const doorInstance = half => ({ "*": { texture: doorTexture(half), render_method: translucent ?? "alpha_test_single_sided" } });
        writeBlock("construction/door", doorId, block(doorId, {
            menu: { category: "none" },
            states: { "tofucraft:open": intState(0, 1), "tofucraft:hinge": intState(0, 1) },
            traits: {
                "minecraft:multi_block": { enabled_states: ["minecraft:multi_block_part"], direction: "up", parts: 2 },
                "minecraft:placement_direction": { enabled_states: ["minecraft:cardinal_direction"] },
            },
            components: {
                "minecraft:geometry": geometryOf("door", doorVisibility),
                "minecraft:material_instances": doorInstance("lower"),
                ...basic,
                // Dropped by the script once per door, whichever part breaks.
                "minecraft:loot": emptyLoot,
                "minecraft:tags": [...toolTags(m, m.requiresTool), "tofucraft:door"],
                "minecraft:movable": { movement_type: "popped" },
                "minecraft:liquid_detection": WATERLOGGABLE,
                "minecraft:redstone_consumer": {},
                // Java BlockDoor: Material.iron doors ignore players and follow redstone only.
                [metal ? "tofucraft:redstone_door" : "tofucraft:door"]: {},
                ...fragile,
            },
            permutations: [
                permutation("q.block_state('minecraft:multi_block_part') == 1", { "minecraft:material_instances": doorInstance("upper") }),
                ...S.doorShapes().map(s => permutation(s.condition, {
                    "minecraft:collision_box": S.toBox(s.box),
                    "minecraft:selection_box": S.toBox(s.box),
                })),
            ],
        }));
        sounds[doorId] = { sound: m.sound };

        // ---------------------------------------------------------------- torches (none for glow tofu, as in Java)
        if (m.key !== "glow") {
            const torchId = idOf(m, "torch");
            const torchTexture = textureFile(`${javaName(m)}_tofu_torch`);
            atlas[short(torchId)] = { textures: `textures/blocks/${torchTexture}` };
            writeBlock("construction/torch", torchId, block(torchId, {
                menu: { category: "items", group: GROUPS.torch },
                traits: { "minecraft:placement_position": { enabled_states: ["minecraft:block_face"] } },
                components: {
                    "minecraft:geometry": geometryOf("torch", torchVisibility),
                    "minecraft:material_instances": { "*": { texture: short(torchId), render_method: "alpha_test", ambient_occlusion: 0 } },
                    "minecraft:collision_box": false,
                    "minecraft:selection_box": S.toBox(S.torchShapes()[0].selection),
                    ...destructible(m.hardness, m.resistance),
                    "minecraft:light_emission": 14,
                    "minecraft:light_dampening": 0,
                    "minecraft:tags": toolTags(m, false),
                    // The official schema lists the faces one by one ("side" is not in it).
                    "minecraft:placement_filter": { conditions: [{ allowed_faces: ["up", "north", "south", "east", "west"] }] },
                    "minecraft:liquid_detection": { detection_rules: [{ liquid_type: "water", on_liquid_touches: "popped" }] },
                    "minecraft:movable": { movement_type: "popped" },
                    "minecraft:tick": { interval_range: [10, 20], looping: true },
                    "tofucraft:torch": {},
                },
                permutations: S.torchShapes().slice(1).map(s => permutation(s.condition, { "minecraft:selection_box": S.toBox(s.selection) })),
            }));
            sounds[torchId] = { sound: m.sound };
        }
    }

    return {
        zh_CN: { [GROUPS.stairs]: "豆腐工艺：楼梯", [GROUPS.slab]: "豆腐工艺：台阶" },
        en_US: { [GROUPS.stairs]: "TofuCraft: Stairs", [GROUPS.slab]: "TofuCraft: Slabs" },
    };
}
