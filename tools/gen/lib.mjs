// Shared helpers for the pack generators: stable JSON output (4-space indent, CRLF, no trailing newline, like the
// hand-written pack files) and merging of the resource pack registries.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const BP = path.join(ROOT, "tofucraft[B]");
export const RP = path.join(ROOT, "tofucraft[R]");

const written = [];
export const report = () => written.slice();

function serialize(value, indent, compact) {
    let text = JSON.stringify(value, null, indent);
    // Arrays of plain values on one line (geometry files are mostly coordinates).
    if (compact) text = text.replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, inner) => `[${inner.split(/,\s+/).join(", ")}]`);
    return text.replace(/\n/g, "\r\n");
}

/**
 * Writes JSON only when the content changes; returns true if the file was (re)written. An existing file keeps its
 * trailing newline (or lack of one); new files get one only when asked. `compact` keeps arrays of plain values on one line.
 */
export function writeJson(file, value, { indent = 4, trailingNewline, compact = false } = {}) {
    if (trailingNewline === undefined) trailingNewline = fs.existsSync(file) && /\n$/.test(fs.readFileSync(file, "utf8"));
    const text = serialize(value, indent, compact) + (trailingNewline ? "\r\n" : "");
    if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === text) return false;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    written.push(path.relative(ROOT, file).split(path.sep).join("/"));
    return true;
}

/** Reads a JSON file, returning `fallback` when it does not exist. */
export function readJson(file, fallback) {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

/** Detects the indent of an existing JSON file so merged registries keep their formatting. */
function indentOf(file, fallback) {
    if (!fs.existsSync(file)) return fallback;
    const m = /\n([ \t]+)"/.exec(fs.readFileSync(file, "utf8"));
    return m ? m[1] : fallback;
}

/** Adds or replaces entries of terrain_texture.json / item_texture.json "texture_data". */
export function mergeAtlas(file, entries) {
    const doc = readJson(file);
    for (const [key, value] of Object.entries(entries)) doc.texture_data[key] = value;
    writeJson(file, doc, { indent: indentOf(file, 4) });
}

/** Adds or replaces top-level entries of RP blocks.json (block sounds). */
export function mergeBlocksJson(entries) {
    const file = path.join(RP, "blocks.json");
    const doc = readJson(file, { format_version: [1, 1, 0] });
    for (const [id, value] of Object.entries(entries)) doc[id] = value;
    writeJson(file, doc, { indent: indentOf(file, 4) });
}

/** Adds or replaces flipbook entries (keyed by atlas_tile). */
export function mergeFlipbooks(entries) {
    const file = path.join(RP, "textures/flipbook_textures.json");
    const list = readJson(file, []);
    for (const entry of entries) {
        const at = list.findIndex(e => e.atlas_tile === entry.atlas_tile);
        if (at >= 0) list[at] = entry;
        else list.push(entry);
    }
    writeJson(file, list, { indent: indentOf(file, 4), trailingNewline: true });
}

/**
 * Makes sure every key exists in the language file. Existing values are kept (they may have been edited by hand);
 * keys listed in `rename` are renamed in place first. Missing keys are appended at the end of the file.
 */
export function mergeLang(lang, entries, rename = {}) {
    const file = path.join(RP, "texts", `${lang}.lang`);
    const text = fs.readFileSync(file, "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const trailing = /\r?\n$/.test(text);
    let lines = text.replace(/\r?\n$/, "").split(/\r?\n/);
    const keyOf = line => (line.includes("=") && !line.startsWith("#") ? line.slice(0, line.indexOf("=")) : undefined);
    lines = lines.map(line => {
        const key = keyOf(line);
        return key && rename[key] && !lines.some(l => keyOf(l) === rename[key]) ? `${rename[key]}=${line.slice(key.length + 1)}` : line;
    });
    const present = new Set(lines.map(keyOf).filter(Boolean));
    const missing = Object.entries(entries).filter(([key]) => !present.has(key));
    if (missing.length) {
        if (lines[lines.length - 1] !== "") lines.push("");
        for (const [key, value] of missing) lines.push(`${key}=${value}`);
    }
    const out = lines.join(eol) + (trailing ? eol : "");
    if (out !== text) {
        fs.writeFileSync(file, out);
        written.push(path.relative(ROOT, file).split(path.sep).join("/"));
    }
}
