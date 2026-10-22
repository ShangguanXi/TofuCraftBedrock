// The 17 tofu materials of Java TofuCraft 1.7.10 (item/TofuMaterial + data/TofuInfo). Hardness is Bedrock's
// seconds_to_destroy; resistance is the Java blast resistance as players see it (0.6 * setResistance, or the hardness).
//
// tool:  "shovel" / "pickaxe" set the mining tag; requiresTool marks Material.iron (drops only with a stone pickaxe+)
// map:   Java MapColor of the material (tofu = cloth, dried = sponge/yellow, metal = iron)
// java:  the Java TofuMaterial name when it differs from key (texture names use it)
export const TOFU_MATERIALS = [
    { key: "kinu", item: "kinu_tofu", texture: "blocktofukinu", hardness: 0.1, resistance: 0.1, tool: "shovel", sound: "snow", map: "#C7C7C7" },
    { key: "momen", item: "momen_tofu", texture: "blocktofumomen", hardness: 0.4, resistance: 0.4, tool: "shovel", sound: "snow", map: "#C7C7C7" },
    { key: "ishi", item: "ishi_tofu", texture: "blocktofuishi", hardness: 2.0, resistance: 6.0, tool: "pickaxe", sound: "wood", map: "#C7C7C7" },
    { key: "metal", item: "metal_tofu", texture: "blocktofumetal", hardness: 6.0, resistance: 9.0, tool: "pickaxe", requiresTool: true, sound: "metal", map: "#A7A7A7" },
    { key: "grilled", item: "grilled_tofu", texture: "blocktofugrilled", sideTexture: "blocktofumomen", hardness: 1.0, resistance: 30.0, tool: "shovel", sound: "snow", map: "#C7C7C7" },
    { key: "dried", item: "dried_tofu", texture: "blocktofudried", hardness: 1.0, resistance: 1.2, tool: "shovel", sound: "stone", map: "#E5E533" },
    { key: "fried_tofu_pouch", java: "friedPouch", item: "fried_tofu_pouch", block: "fried_tofu_pouch_block", texture: "blocktofufriedpouch", hardness: 1.0, resistance: 4.8, tool: "shovel", sound: "sand", map: "#C7C7C7" },
    { key: "fried", item: "fried_tofu", texture: "blocktofufried", hardness: 2.0, resistance: 6.0, tool: "shovel", sound: "gravel", map: "#C7C7C7" },
    { key: "egg", item: "egg_tofu", texture: "blocktofuegg", hardness: 0.2, resistance: 0.2, tool: "shovel", sound: "snow", map: "#C7C7C7" },
    { key: "annin", item: "annin_tofu", texture: "blocktofuannin", hardness: 0.2, resistance: 0.2, tool: "shovel", sound: "snow", map: "#C7C7C7", translucent: true },
    { key: "sesame", item: "sesame_tofu", texture: "blocktofusesame", hardness: 0.2, resistance: 0.2, tool: "shovel", sound: "snow", map: "#C7C7C7" },
    { key: "zunda", item: "zunda_tofu", texture: "blocktofuzunda", hardness: 0.3, resistance: 0.3, tool: "shovel", sound: "snow", map: "#C7C7C7" },
    { key: "strawberry", item: "strawberry_tofu", texture: "blocktofustrawberry", hardness: 0.5, resistance: 0.5, tool: "shovel", sound: "snow", map: "#C7C7C7" },
    { key: "hell", item: "hell_tofu", texture: "blocktofuhell", hardness: 0.5, resistance: 0.5, tool: "shovel", sound: "snow", map: "#C7C7C7" },
    { key: "glow", item: "glow_tofu", texture: "blocktofuglow", hardness: 0.5, resistance: 0.5, tool: "shovel", sound: "snow", map: "#C7C7C7", light: 14 },
    { key: "diamond", item: "diamond_tofu", texture: "blocktofudiamond", hardness: 8.0, resistance: 9.0, tool: "pickaxe", sound: "glass", map: "#C7C7C7" },
    { key: "miso", item: "miso_tofu", texture: "blocktofumiso", hardness: 0.5, resistance: 0.5, tool: "shovel", sound: "snow", map: "#C7C7C7" },
];

// Script behaviour of the fragile / draining tofu blocks and the block state each keeps its 0-7 progress in.
export const TOFU_BEHAVIOUR = {
    kinu: { component: "tofucraft:kinu_tofu_block", state: "tofucraft:freeze_step", fallOn: true },
    momen: { component: "tofucraft:momen_tofu_block", state: "tofucraft:drain_step" },
    ishi: { component: "tofucraft:ishi_tofu_block", state: "tofucraft:drain_step" },
};

export const blockIdOf = m => `tofucraft:${m.block ?? `${m.key}_tofu_block`}`;
export const itemIdOf = m => `tofucraft:${m.item}`;
