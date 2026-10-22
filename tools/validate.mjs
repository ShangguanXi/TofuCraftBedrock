// Static checks for the TofuCraft packs: ids, textures, language keys, groups, format versions and leftovers of old
// formats. Run from the repo root: node tools/validate.mjs  (exit code 1 on errors; warnings do not fail)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BP = path.join(ROOT, "tofucraft[B]");
const RP = path.join(ROOT, "tofucraft[R]");
const FORMAT = "1.26.50";
const NS = "tofucraft:";

const errors = [];
const warnings = [];
const error = (file, msg) => errors.push(`${rel(file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${rel(file)}: ${msg}`);
const rel = file => path.relative(ROOT, file).split(path.sep).join("/");

function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        error(file, `invalid JSON (${e.message})`);
        return undefined;
    }
}
function readLang(file) {
    const map = new Map();
    if (!fs.existsSync(file)) return map;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
        const i = line.indexOf("=");
        if (i > 0 && !line.startsWith("#")) map.set(line.slice(0, i).trim(), line.slice(i + 1));
    }
    return map;
}
/** Every "tofucraft:" string in a value, skipping { "tag": ... } members. */
function tofuRefs(value, out = new Set()) {
    if (typeof value === "string") {
        if (value.startsWith(NS)) out.add(value);
    } else if (Array.isArray(value)) {
        value.forEach(v => tofuRefs(v, out));
    } else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) if (k !== "tag") tofuRefs(v, out);
    }
    return out;
}

// ---------- collect definitions ----------
const items = new Map(); // id -> { file, body }
const blocks = new Map();
for (const [dir, key, map] of [[path.join(BP, "items"), "minecraft:item", items], [path.join(BP, "blocks"), "minecraft:block", blocks]]) {
    for (const file of walk(dir).filter(f => f.endsWith(".json"))) {
        const doc = readJson(file);
        const body = doc?.[key];
        if (!body) { error(file, `missing "${key}"`); continue; }
        const id = body.description?.identifier;
        // An item may share its block's identifier when it is that block's item ("replace_block_item", doors).
        const blockItem = map === blocks && items.get(id)?.body.components?.["minecraft:block_placer"];
        const replacesBlockItem = blockItem?.block === id && blockItem.replace_block_item === true;
        if (map.has(id) || (map === blocks && items.has(id) && !replacesBlockItem)) error(file, `duplicate identifier ${id} (also ${rel(map.get(id)?.file ?? items.get(id).file)})`);
        map.set(id, { file, body, doc });
        if (doc.format_version !== FORMAT) warn(file, `format_version ${doc.format_version} (expected ${FORMAT})`);
    }
}
const defined = new Set([...items.keys(), ...blocks.keys()]);

// ---------- resource pack registries ----------
// Vanilla resources the pack uses on purpose (the salt pan's cobblestone base, oak frame and tinted water).
const VANILLA_TEXTURE_PATHS = new Set(["textures/blocks/planks_oak", "textures/blocks/cobblestone"]);
const VANILLA_TERRAIN_KEYS = new Set(["still_water_grey"]);
const VANILLA_GEOMETRY = new Set(["minecraft:geometry.full_block", "minecraft:geometry.cross"]);
const textureFiles = new Set(walk(path.join(RP, "textures")).filter(f => /\.(png|tga)$/.test(f)).map(f => rel(f).replace(/^tofucraft\[R\]\//, "").replace(/\.(png|tga)$/, "")));
function checkAtlas(file) {
    const atlas = readJson(file)?.texture_data ?? {};
    for (const [key, entry] of Object.entries(atlas)) {
        for (const t of [].concat(entry.textures)) {
            const p = typeof t === "string" ? t : t?.path;
            if (!textureFiles.has(p) && !VANILLA_TEXTURE_PATHS.has(p)) error(file, `texture "${key}" -> ${p} does not exist (paths are case-sensitive on some platforms)`);
        }
    }
    return new Set([...Object.keys(atlas), ...(file.endsWith("terrain_texture.json") ? VANILLA_TERRAIN_KEYS : [])]);
}
const itemAtlas = checkAtlas(path.join(RP, "textures/item_texture.json"));
const terrainAtlas = checkAtlas(path.join(RP, "textures/terrain_texture.json"));
const flipbookFile = path.join(RP, "textures/flipbook_textures.json");
for (const entry of fs.existsSync(flipbookFile) ? readJson(flipbookFile) ?? [] : []) {
    if (!terrainAtlas.has(entry.atlas_tile)) error(flipbookFile, `flipbook atlas_tile "${entry.atlas_tile}" is not in terrain_texture.json`);
    if (!textureFiles.has(entry.flipbook_texture)) error(flipbookFile, `flipbook texture ${entry.flipbook_texture} does not exist`);
}
const geometries = new Map(); // identifier -> bone names
for (const file of walk(path.join(RP, "models")).filter(f => f.endsWith(".json"))) {
    for (const g of readJson(file)?.["minecraft:geometry"] ?? []) geometries.set(g.description?.identifier, new Set((g.bones ?? []).map(b => b.name)));
}
const cullingRules = new Set(walk(path.join(RP, "block_culling")).filter(f => f.endsWith(".json"))
    .map(f => readJson(f)?.["minecraft:block_culling_rules"]?.description?.identifier));
const en = readLang(path.join(RP, "texts/en_US.lang"));
const zh = readLang(path.join(RP, "texts/zh_CN.lang"));
const languages = readJson(path.join(RP, "texts/languages.json")) ?? [];
for (const lang of ["en_US", "zh_CN"]) if (!languages.includes(lang)) error(path.join(RP, "texts/languages.json"), `missing ${lang}`);
function checkLangKey(file, key, what) {
    if (!en.has(key)) error(file, `${what} "${key}" missing from en_US.lang`);
    if (!zh.has(key)) error(file, `${what} "${key}" missing from zh_CN.lang`);
}

// ---------- crafting catalog ----------
const groups = new Set();
for (const file of walk(path.join(BP, "item_catalog")).filter(f => f.endsWith(".json"))) {
    const doc = readJson(file);
    if (!doc) continue;
    if (doc.format_version !== FORMAT) warn(file, `format_version ${doc.format_version} (expected ${FORMAT})`);
    for (const category of doc["minecraft:crafting_items_catalog"]?.categories ?? []) {
        for (const group of category.groups ?? []) {
            const name = group.group_identifier?.name;
            if (name) {
                groups.add(name);
                checkLangKey(file, name, "group name");
                const icon = group.group_identifier.icon;
                if (icon?.startsWith(NS) && !defined.has(icon)) error(file, `group ${name} icon ${icon} is not defined`);
            }
            for (const item of group.items ?? []) {
                const id = typeof item === "string" ? item : item?.name;
                if (id?.startsWith(NS) && !defined.has(id)) error(file, `group ${name} lists undefined ${id}`);
            }
        }
    }
}

// ---------- items ----------
for (const [id, { file, body }] of items) {
    const c = body.components ?? {};
    const group = body.description?.menu_category?.group;
    if (group && !group.startsWith("minecraft:") && !groups.has(group)) error(file, `menu group ${group} is not in the crafting catalog`);
    const icon = c["minecraft:icon"]?.textures?.default ?? c["minecraft:icon"]?.texture ?? c["minecraft:icon"];
    if (typeof icon === "string" && !itemAtlas.has(icon)) error(file, `icon "${icon}" is not in item_texture.json`);
    const name = c["minecraft:display_name"]?.value;
    if (name) checkLangKey(file, name, "display name");
    else warn(file, "no minecraft:display_name");
    const { "minecraft:tags": _tags, ...rest } = c; // item tags are tag names, not item ids
    for (const ref of tofuRefs(rest)) if (ref !== id && !defined.has(ref)) error(file, `references undefined ${ref}`);
    const placer = c["minecraft:block_placer"];
    const target = placer && (typeof placer.block === "string" ? placer.block : placer.block?.name);
    if (target && !target.startsWith("minecraft:") && !blocks.has(target)) error(file, `block_placer places undefined block ${target}`);
    if (c["minecraft:use_modifiers"] && c["minecraft:use_modifiers"].start_using === undefined) warn(file, "use_modifiers without start_using (defaults to if_first since 1.26.30)");
    for (const key of Object.keys(c)) if (!key.includes(":")) error(file, `component "${key}" has no namespace (not a valid component)`);
}

// ---------- blocks ----------
const scriptText = walk(path.join(BP, "scripts")).filter(f => f.endsWith(".js")).map(f => fs.readFileSync(f, "utf8")).join("\n");
const registered = new Set([...scriptText.matchAll(/(?:blockComponent|itemComponent|registerCustomComponent)\(\s*"([^"]+)"/g)].map(m => m[1]));
for (const [id, { file, body }] of blocks) {
    const all = [body.components ?? {}, ...(body.permutations ?? []).map(p => p.components ?? {})];
    checkLangKey(file, `tile.${id}.name`, "block name");
    for (const c of all) {
        for (const key of Object.keys(c)) {
            if (key.startsWith("tag:")) error(file, `legacy "${key}" component (format 1.26.20+ needs "minecraft:tags")`);
            if (key.startsWith(NS) && !registered.has(key)) error(file, `custom component ${key} is not registered by any script`);
        }
        for (const inst of Object.values(c["minecraft:material_instances"] ?? {})) {
            if (inst?.texture && !terrainAtlas.has(inst.texture)) error(file, `texture "${inst.texture}" is not in terrain_texture.json`);
        }
        const loot = c["minecraft:loot"];
        if (loot && !fs.existsSync(path.join(BP, loot))) error(file, `loot table ${loot} does not exist`);
        const geometry = c["minecraft:geometry"];
        const geometryId = typeof geometry === "string" ? geometry : geometry?.identifier;
        if (geometryId && !geometries.has(geometryId) && !VANILLA_GEOMETRY.has(geometryId)) error(file, `geometry ${geometryId} is not in the resource pack models`);
        if (geometry?.culling && !cullingRules.has(geometry.culling)) error(file, `culling rules ${geometry.culling} are not in the resource pack block_culling`);
        for (const bone of Object.keys(geometry?.bone_visibility ?? {})) {
            if (geometries.has(geometryId) && !geometries.get(geometryId).has(bone)) error(file, `bone_visibility names bone "${bone}" that ${geometryId} does not have`);
        }
    }
}
const blocksJson = readJson(path.join(RP, "blocks.json")) ?? {};
for (const id of Object.keys(blocksJson)) {
    if (id !== "format_version" && id.startsWith(NS) && !blocks.has(id)) error(path.join(RP, "blocks.json"), `sound entry for undefined block ${id}`);
}

// ---------- recipes ----------
const recipeIds = new Map();
for (const file of walk(path.join(BP, "recipes")).filter(f => f.endsWith(".json"))) {
    const doc = readJson(file);
    if (!doc) continue;
    const kind = Object.keys(doc).find(k => k.startsWith("minecraft:recipe_"));
    if (!kind) { error(file, "not a recipe"); continue; }
    const r = doc[kind];
    if (doc.format_version !== FORMAT) warn(file, `format_version ${doc.format_version} (expected ${FORMAT})`);
    if (!r.unlock) error(file, "no unlock (required from format 1.20.10)");
    const rid = r.description?.identifier;
    if (recipeIds.has(rid)) error(file, `duplicate recipe identifier ${rid} (also ${rel(recipeIds.get(rid))})`);
    recipeIds.set(rid, file);
    for (const ref of tofuRefs({ key: r.key, ingredients: r.ingredients, input: r.input, output: r.output, result: r.result })) {
        if (!defined.has(ref)) error(file, `references undefined ${ref}`);
    }
}

// ---------- loot tables ----------
for (const file of walk(path.join(BP, "loot_tables")).filter(f => f.endsWith(".json"))) {
    const doc = readJson(file);
    for (const ref of tofuRefs(doc)) if (!defined.has(ref)) error(file, `references undefined ${ref}`);
}

// ---------- attachables ----------
for (const file of walk(path.join(RP, "attachables")).filter(f => f.endsWith(".json"))) {
    const desc = readJson(file)?.["minecraft:attachable"]?.description;
    if (!desc) continue;
    if (!items.has(desc.identifier)) error(file, `attachable for undefined item ${desc.identifier}`);
    for (const t of Object.values(desc.textures ?? {})) {
        if (t.startsWith("textures/misc/")) continue; // vanilla glint
        if (!textureFiles.has(t)) error(file, `texture ${t} does not exist`);
    }
}

// ---------- scripts ----------
const blockStates = [...blocks.values()].flatMap(({ body }) => Object.keys(body.description?.states ?? {}));
const knownNonItems = new Set([...registered, ...blockStates, "tofucraft:tofu_world"]);
for (const file of walk(path.join(BP, "scripts")).filter(f => f.endsWith(".js"))) {
    const text = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    if (/tufocraft/.test(text)) error(file, `misspelled namespace "tufocraft"`);
    for (const m of text.matchAll(/"(tofucraft:[a-z0-9_]+)"/g)) {
        if (!defined.has(m[1]) && !knownNonItems.has(m[1])) warn(file, `string ${m[1]} is neither a defined item/block nor a registered component`);
    }
}

// ---------- report ----------
const counts = `${items.size} items, ${blocks.size} blocks, ${recipeIds.size} recipes`;
for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
console.log(`validate: ${counts}; ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exitCode = errors.length ? 1 : 0;
