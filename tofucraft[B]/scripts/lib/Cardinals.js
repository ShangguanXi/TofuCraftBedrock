import { Direction } from "@minecraft/server";
const OPPOSITE = { north: "south", south: "north", east: "west", west: "east" };
const LEFT = { north: "west", west: "south", south: "east", east: "north" };
const RIGHT = { north: "east", east: "south", south: "west", west: "north" };
const OFFSET = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    east: { x: 1, y: 0, z: 0 },
    west: { x: -1, y: 0, z: 0 },
};
const FROM_DIRECTION = {
    [Direction.North]: "north",
    [Direction.South]: "south",
    [Direction.East]: "east",
    [Direction.West]: "west",
};
/**
 * Horizontal directions, the way "minecraft:cardinal_direction" names them.
 */
export class Cardinals {
    static of(value) {
        return typeof value === "string" && value in OPPOSITE ? value : undefined;
    }
    static opposite(direction) {
        return OPPOSITE[direction];
    }
    /** The left hand of someone facing `direction`. */
    static leftOf(direction) {
        return LEFT[direction];
    }
    /** The right hand of someone facing `direction`. */
    static rightOf(direction) {
        return RIGHT[direction];
    }
    static neighbour(block, direction) {
        return block.offset(OFFSET[direction]);
    }
    /** The horizontal part of a block face; undefined for up and down. */
    static fromDirection(direction) {
        return FROM_DIRECTION[direction];
    }
    /** Where an entity looks, from its yaw (0 = south, 90 = west, 180 = north, -90 = east). */
    static fromYaw(yaw) {
        return ["south", "west", "north", "east"][Math.floor((yaw * 4) / 360 + 0.5) & 3];
    }
}
