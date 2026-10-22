// Shapes of the construction blocks: block geometry (resource pack models) and collision / selection boxes, all
// written from boxes in world pixels so that the model, the boxes and the block states agree with each other.
//
// A box is [x0, y0, z0, x1, y1, z1] in pixels inside the block (0..16), x towards east, y up, z towards south.
// Bedrock block geometry and collision/selection boxes are centred on the block and measure x from the east side
// (+x points west in the file), so a world box maps to origin [8 - x1, y0, z0 - 8].

export const DIRECTIONS = ["north", "east", "south", "west"];
export const opposite = d => ({ north: "south", south: "north", east: "west", west: "east" })[d];
/** Counter-clockwise seen from above: the left hand of someone facing `d`. */
export const leftOf = d => ({ north: "west", west: "south", south: "east", east: "north" })[d];
/** Clockwise seen from above: the right hand of someone facing `d`. */
export const rightOf = d => ({ north: "east", east: "south", south: "west", west: "north" })[d];

/** Collision / selection box data for a world box. */
export function toBox([x0, y0, z0, x1, y1, z1]) {
    return { origin: [8 - x1, y0, z0 - 8], size: [x1 - x0, y1 - y0, z1 - z0] };
}

/** Smallest single box around several world boxes (selection boxes take only one). */
export function union(boxes) {
    return [0, 1, 2].map(i => Math.min(...boxes.map(b => b[i]))).concat([3, 4, 5].map(i => Math.max(...boxes.map(b => b[i]))));
}

// Texture region of each face when the texture is laid over the whole block ("UV lock"), so neighbouring cubes line up.
// Side faces read left to right as seen from outside the block, top of the texture up.
function lockedUv(face, [x0, y0, z0, x1, y1, z1]) {
    switch (face) {
        case "north": return { uv: [16 - x1, 16 - y1], uv_size: [x1 - x0, y1 - y0] };
        case "south": return { uv: [x0, 16 - y1], uv_size: [x1 - x0, y1 - y0] };
        case "west": return { uv: [z0, 16 - y1], uv_size: [z1 - z0, y1 - y0] };
        case "east": return { uv: [16 - z1, 16 - y1], uv_size: [z1 - z0, y1 - y0] };
        default: return { uv: [x0, z0], uv_size: [x1 - x0, z1 - z0] };
    }
}

const FACES = ["north", "east", "south", "west", "up", "down"];

/**
 * One geometry cube. Every face names its direction as material instance, so a block can give "up" its own texture.
 * `faces` overrides the texture region of some faces; faces in `mirror` show their texture flipped left to right.
 */
export function cube(box, { faces = {}, mirror = [] } = {}) {
    const uv = {};
    for (const face of FACES) {
        const region = faces[face] ?? lockedUv(face, box);
        if (!region.uv_size[0] || !region.uv_size[1]) continue;
        const entry = { uv: [...region.uv], uv_size: [...region.uv_size], material_instance: face };
        if (mirror.includes(face)) {
            entry.uv = [region.uv[0] + region.uv_size[0], region.uv[1]];
            entry.uv_size = [-region.uv_size[0], region.uv_size[1]];
        }
        uv[face] = entry;
    }
    return { ...toBox(box), uv };
}

/** A geometry file with one model; `bones` maps bone names to lists of cubes. */
export function geometry(identifier, bones) {
    return {
        format_version: "1.21.0",
        "minecraft:geometry": [{
            description: { identifier, texture_width: 16, texture_height: 16 },
            bones: Object.entries(bones).map(([name, cubes]) => ({ name, pivot: [0, 0, 0], cubes })),
        }],
    };
}

// ---------------------------------------------------------------- Molang helpers
export const state = name => `q.block_state('${name}')`;
export const is = (name, value) => (typeof value === "string" ? `${state(name)} == '${value}'` : `${state(name)} == ${value}`);
export const any = conditions => (conditions.length === 1 ? conditions[0] : conditions.map(c => `(${c})`).join(" || "));
export const all = conditions => conditions.join(" && ");

// ---------------------------------------------------------------- stairs
// Quarters of the stepped half, keyed by their north/south and west/east side.
const QUARTERS = { "north-west": [0, 0], "north-east": [8, 0], "south-west": [0, 8], "south-east": [8, 8] };
const quarterKey = (a, b) => (a === "north" || a === "south" ? `${a}-${b}` : `${b}-${a}`);
export const STAIR_SHAPES = ["none", "inner_left", "inner_right", "outer_left", "outer_right"];

/**
 * Quarters of the stepped half that are filled for stairs facing `facing` (the side of the tall back, where the player
 * looked when placing them) with `minecraft:corner` shape `corner`. Same shapes as Java stairs: "left" is the left
 * hand of someone facing the back.
 */
export function stairQuarters(facing, corner) {
    const back = [quarterKey(facing, leftOf(facing)), quarterKey(facing, rightOf(facing))];
    switch (corner) {
        case "outer_left": return [back[0]];
        case "outer_right": return [back[1]];
        case "inner_left": return [...back, quarterKey(opposite(facing), leftOf(facing))];
        case "inner_right": return [...back, quarterKey(opposite(facing), rightOf(facing))];
        default: return back;
    }
}
const quarterBox = (key, lower) => {
    const [x, z] = QUARTERS[key];
    return lower ? [x, 0, z, x + 8, 8, z + 8] : [x, 8, z, x + 8, 16, z + 8];
};
const HALF = "minecraft:vertical_half", CARDINAL = "minecraft:cardinal_direction", CORNER = "minecraft:corner";

export function stairsGeometry() {
    const bones = { bottom_slab: [cube([0, 0, 0, 16, 8, 16])], top_slab: [cube([0, 8, 0, 16, 16, 16])] };
    for (const key of Object.keys(QUARTERS)) {
        bones[`upper_${key.replace("-", "_")}`] = [cube(quarterBox(key, false))];
        bones[`lower_${key.replace("-", "_")}`] = [cube(quarterBox(key, true))];
    }
    return bones;
}

export function stairsBoneVisibility() {
    const visibility = { bottom_slab: is(HALF, "bottom"), top_slab: is(HALF, "top") };
    for (const key of Object.keys(QUARTERS)) {
        const filled = [];
        for (const facing of DIRECTIONS) {
            const shapes = STAIR_SHAPES.filter(corner => stairQuarters(facing, corner).includes(key));
            if (shapes.length === STAIR_SHAPES.length) filled.push(is(CARDINAL, facing));
            else for (const corner of shapes) filled.push(all([is(CARDINAL, facing), is(CORNER, corner)]));
        }
        visibility[`upper_${key.replace("-", "_")}`] = all([is(HALF, "bottom"), `(${any(filled)})`]);
        visibility[`lower_${key.replace("-", "_")}`] = all([is(HALF, "top"), `(${any(filled)})`]);
    }
    return visibility;
}

/** Collision boxes per stair state: the full half slab plus the filled quarters of the other half. */
export function stairsCollisions() {
    const list = [];
    for (const half of ["bottom", "top"]) {
        for (const facing of DIRECTIONS) {
            for (const corner of STAIR_SHAPES) {
                const slab = half === "bottom" ? [0, 0, 0, 16, 8, 16] : [0, 8, 0, 16, 16, 16];
                const boxes = [slab, ...stairQuarters(facing, corner).map(key => quarterBox(key, half === "top"))];
                list.push({ condition: all([is(HALF, half), is(CARDINAL, facing), is(CORNER, corner)]), boxes });
            }
        }
    }
    return list;
}

// ---------------------------------------------------------------- slabs
export const slabGeometry = () => ({
    bottom: [cube([0, 0, 0, 16, 8, 16])],
    top: [cube([0, 8, 0, 16, 16, 16])],
    double: [cube([0, 0, 0, 16, 16, 16])],
});

// ---------------------------------------------------------------- walls (Java 1.7.10 BlockWall: 8 px post, 6 px arms 13 px high)
const WALL_ARMS = {
    north: [5, 0, 0, 11, 13, 8],
    south: [5, 0, 8, 11, 13, 16],
    west: [0, 0, 5, 8, 13, 11],
    east: [8, 0, 5, 16, 13, 11],
};
const WALL_POST = [4, 0, 4, 12, 16, 12];
const connection = d => `minecraft:connection_${d}`;
const connected = d => state(connection(d));
const notConnected = d => `!${state(connection(d))}`;
/** Java draws no post for a straight wall (connected on exactly two opposite sides). */
const STRAIGHT_WALL = any([
    all([connected("north"), connected("south"), notConnected("east"), notConnected("west")]),
    all([connected("east"), connected("west"), notConnected("north"), notConnected("south")]),
]);

export function wallGeometry() {
    const bones = { post: [cube(WALL_POST)] };
    for (const [d, box] of Object.entries(WALL_ARMS)) bones[d] = [cube(box)];
    return bones;
}

export function wallBoneVisibility() {
    return { post: `!(${STRAIGHT_WALL})`, ...Object.fromEntries(DIRECTIONS.map(d => [d, connected(d)])) };
}

/** Collision (1.5 blocks high, like Java) and selection box for each of the 16 connection states. */
export function wallShapes() {
    const list = [];
    for (let mask = 0; mask < 16; mask++) {
        const on = DIRECTIONS.filter((_, i) => mask & (1 << i));
        const straight = on.length === 2 && opposite(on[0]) === on[1];
        const parts = [...(straight ? [] : [WALL_POST]), ...on.map(d => WALL_ARMS[d])];
        const selection = union(parts);
        selection[4] = straight ? 13 : 16;
        list.push({
            condition: all(DIRECTIONS.map(d => (on.includes(d) ? connected(d) : notConnected(d)))),
            collision: parts.map(b => [b[0], 0, b[2], b[3], 24, b[5]]),
            selection,
        });
    }
    return list;
}

// ---------------------------------------------------------------- fence gates (Java 1.7.10 RenderBlocks.renderBlockFenceGate)
// Written for a gate across the x axis (placed facing north or south); `swap` turns it to run along z.
const swap = ([x0, y0, z0, x1, y1, z1]) => [z0, y0, x0, z1, y1, x1];
const GATE_POSTS = [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9]];
const GATE_CLOSED = [
    [6, 6, 7, 8, 15, 9], [8, 6, 7, 10, 15, 9],
    [10, 6, 7, 14, 9, 9], [10, 12, 7, 14, 15, 9],
    [2, 6, 7, 6, 9, 9], [2, 12, 7, 6, 15, 9],
];
// Open leaves swung towards +z (a player facing south pushed it open); `flip` mirrors them to -z.
const GATE_OPEN_SOUTH = [0, 14].flatMap(x => [[x, 6, 13, x + 2, 15, 15], [x, 6, 9, x + 2, 9, 13], [x, 12, 9, x + 2, 15, 13]]);
const flipZ = ([x0, y0, z0, x1, y1, z1]) => [x0, y0, 16 - z1, x1, y1, 16 - z0];
const OPEN = "tofucraft:open";

export function fenceGateGeometry() {
    return {
        posts_x: GATE_POSTS.map(b => cube(b)),
        posts_z: GATE_POSTS.map(b => cube(swap(b))),
        closed_x: GATE_CLOSED.map(b => cube(b)),
        closed_z: GATE_CLOSED.map(b => cube(swap(b))),
        open_south: GATE_OPEN_SOUTH.map(b => cube(b)),
        open_north: GATE_OPEN_SOUTH.map(b => cube(flipZ(b))),
        open_east: GATE_OPEN_SOUTH.map(b => cube(swap(b))),
        open_west: GATE_OPEN_SOUTH.map(b => cube(swap(flipZ(b)))),
    };
}

const acrossX = any([is(CARDINAL, "north"), is(CARDINAL, "south")]);
const acrossZ = any([is(CARDINAL, "east"), is(CARDINAL, "west")]);
export function fenceGateBoneVisibility() {
    return {
        posts_x: acrossX,
        posts_z: acrossZ,
        closed_x: all([is(OPEN, 0), `(${acrossX})`]),
        closed_z: all([is(OPEN, 0), `(${acrossZ})`]),
        ...Object.fromEntries(DIRECTIONS.map(d => [`open_${d}`, all([is(OPEN, 1), is(CARDINAL, d)])])),
    };
}

/** Closed gates collide 1.5 blocks high; open gates do not collide. The selection box does not move. */
export function fenceGateShapes() {
    return [
        { condition: acrossX, axis: "x", selection: [0, 0, 6, 16, 16, 10], collision: [0, 0, 6, 16, 24, 10], connect: ["east", "west"] },
        { condition: acrossZ, axis: "z", selection: [6, 0, 0, 10, 16, 16], collision: [6, 0, 0, 10, 24, 16], connect: ["north", "south"] },
    ];
}

// ---------------------------------------------------------------- trapdoors (3 px thick)
const TRAPDOOR = {
    closed_bottom: [0, 0, 0, 16, 3, 16],
    closed_top: [0, 13, 0, 16, 16, 16],
    open_north: [0, 0, 0, 16, 16, 3],
    open_south: [0, 0, 13, 16, 16, 16],
    open_west: [0, 0, 0, 3, 16, 16],
    open_east: [13, 0, 0, 16, 16, 16],
};

export const trapdoorGeometry = () => Object.fromEntries(Object.entries(TRAPDOOR).map(([name, box]) => [name, [cube(box)]]));

/**
 * The hinge is on the `minecraft:cardinal_direction` side: an open trapdoor stands against that side.
 * Closed trapdoors lie in the half given by `minecraft:vertical_half`.
 */
export function trapdoorStates() {
    return [
        { bone: "closed_bottom", condition: all([is(OPEN, 0), is(HALF, "bottom")]) },
        { bone: "closed_top", condition: all([is(OPEN, 0), is(HALF, "top")]) },
        ...DIRECTIONS.map(d => ({ bone: `open_${d}`, condition: all([is(OPEN, 1), is(CARDINAL, d)]), side: d })),
    ].map(s => ({ ...s, box: TRAPDOOR[s.bone] }));
}

// ---------------------------------------------------------------- doors (3 px thick, one block per part)
const DOOR_PANELS = {
    north: [0, 0, 0, 16, 16, 3],
    south: [0, 0, 13, 16, 16, 16],
    west: [0, 0, 0, 3, 16, 16],
    east: [13, 0, 0, 16, 16, 16],
};
// Direction to the right of someone looking at a face with this outward normal.
const RIGHT_OF_FACE = { north: "west", south: "east", east: "north", west: "south" };
const HINGE = "tofucraft:hinge";

/**
 * Where the door panel is for a door placed facing `facing` (hinge 0 = left, 1 = right, as seen by the player who
 * placed it), and which end the hinge is at (Java BlockDoor bounds): closed it lies on the placer's side, open it lies
 * on the hinge side.
 */
export function doorPanel(facing, open, hinge) {
    const hingeSide = hinge ? rightOf(facing) : leftOf(facing);
    return open ? { side: hingeSide, hingeEnd: opposite(facing) } : { side: opposite(facing), hingeEnd: hingeSide };
}

/**
 * The door texture has its handle on the right. Like Java's IconFlipped, a face is mirrored when the hinge would be on
 * the right of someone looking at it, so the handle always ends up on the free edge. Bone "<side>_a" mirrors the outer
 * face, "<side>_b" the inner one.
 */
export const doorVariant = ({ side, hingeEnd }) => (RIGHT_OF_FACE[side] === hingeEnd ? "a" : "b");

export function doorGeometry() {
    const bones = {};
    for (const [side, box] of Object.entries(DOOR_PANELS)) {
        bones[`${side}_a`] = [cube(box, { mirror: [side] })];
        bones[`${side}_b`] = [cube(box, { mirror: [opposite(side)] })];
    }
    return bones;
}

function doorCombos() {
    const combos = [];
    for (const facing of DIRECTIONS) {
        for (const open of [0, 1]) {
            for (const hinge of [0, 1]) {
                const panel = doorPanel(facing, open, hinge);
                combos.push({ condition: all([is(CARDINAL, facing), is(OPEN, open), is(HINGE, hinge)]), ...panel, variant: doorVariant(panel) });
            }
        }
    }
    return combos;
}

export function doorBoneVisibility() {
    const visibility = {};
    for (const side of Object.keys(DOOR_PANELS)) {
        for (const variant of ["a", "b"]) {
            visibility[`${side}_${variant}`] = any(doorCombos().filter(c => c.side === side && c.variant === variant).map(c => c.condition));
        }
    }
    return visibility;
}

/** Collision and selection box of each panel position. */
export function doorShapes() {
    return Object.entries(DOOR_PANELS).map(([side, box]) => ({ side, box, condition: any(doorCombos().filter(c => c.side === side).map(c => c.condition)) }));
}

// ---------------------------------------------------------------- torches (upright; wall torches stand against the wall)
// Texture: the stick is the 2 x 10 column at u 7-9, v 6-16 of the torch texture, its top the 2 x 2 at v 6-8.
const TORCH_FACES = {
    north: { uv: [7, 6], uv_size: [2, 10] },
    south: { uv: [7, 6], uv_size: [2, 10] },
    east: { uv: [7, 6], uv_size: [2, 10] },
    west: { uv: [7, 6], uv_size: [2, 10] },
    up: { uv: [7, 6], uv_size: [2, 2] },
    down: { uv: [7, 14], uv_size: [2, 2] },
};
// minecraft:block_face is the face that was clicked: "north" means the torch hangs on the north face of the block south of it.
const TORCH = {
    up: { stick: [7, 0, 7, 9, 10, 9], selection: [6, 0, 6, 10, 10, 10], flame: [0.5, 0.7, 0.5] },
    north: { stick: [7, 3, 14, 9, 13, 16], selection: [5, 3, 11, 11, 13, 16], flame: [0.5, 0.92, 0.94] },
    south: { stick: [7, 3, 0, 9, 13, 2], selection: [5, 3, 0, 11, 13, 5], flame: [0.5, 0.92, 0.06] },
    east: { stick: [0, 3, 7, 2, 13, 9], selection: [0, 3, 5, 5, 13, 11], flame: [0.06, 0.92, 0.5] },
    west: { stick: [14, 3, 7, 16, 13, 9], selection: [11, 3, 5, 16, 13, 11], flame: [0.94, 0.92, 0.5] },
};
export const TORCH_FLAMES = Object.fromEntries(Object.entries(TORCH).map(([face, t]) => [face, t.flame]));
const FACE = "minecraft:block_face";

export const torchGeometry = () => Object.fromEntries(Object.entries(TORCH).map(([face, t]) => [face === "up" ? "standing" : `wall_${face}`, [cube(t.stick, { faces: TORCH_FACES })]]));
export const torchBoneVisibility = () => Object.fromEntries(Object.keys(TORCH).map(face => [face === "up" ? "standing" : `wall_${face}`, is(FACE, face)]));
export const torchShapes = () => Object.entries(TORCH).map(([face, t]) => ({ condition: is(FACE, face), selection: t.selection }));
