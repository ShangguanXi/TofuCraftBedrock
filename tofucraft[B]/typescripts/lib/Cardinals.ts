import { Block, Direction, Vector3 } from "@minecraft/server";

/** Values of the "minecraft:cardinal_direction" block state. */
export type Cardinal = "north" | "east" | "south" | "west";

const OPPOSITE: Record<Cardinal, Cardinal> = { north: "south", south: "north", east: "west", west: "east" };
const LEFT: Record<Cardinal, Cardinal> = { north: "west", west: "south", south: "east", east: "north" };
const RIGHT: Record<Cardinal, Cardinal> = { north: "east", east: "south", south: "west", west: "north" };
const OFFSET: Record<Cardinal, Vector3> = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    east: { x: 1, y: 0, z: 0 },
    west: { x: -1, y: 0, z: 0 },
};
const FROM_DIRECTION: Partial<Record<Direction, Cardinal>> = {
    [Direction.North]: "north",
    [Direction.South]: "south",
    [Direction.East]: "east",
    [Direction.West]: "west",
};

/**
 * Horizontal directions, the way "minecraft:cardinal_direction" names them.
 */
export class Cardinals {
    public static of(value: unknown): Cardinal | undefined {
        return typeof value === "string" && value in OPPOSITE ? (value as Cardinal) : undefined;
    }

    public static opposite(direction: Cardinal): Cardinal {
        return OPPOSITE[direction];
    }

    /** The left hand of someone facing `direction`. */
    public static leftOf(direction: Cardinal): Cardinal {
        return LEFT[direction];
    }

    /** The right hand of someone facing `direction`. */
    public static rightOf(direction: Cardinal): Cardinal {
        return RIGHT[direction];
    }

    public static neighbour(block: Block, direction: Cardinal): Block | undefined {
        return block.offset(OFFSET[direction]);
    }

    /** The horizontal part of a block face; undefined for up and down. */
    public static fromDirection(direction: Direction): Cardinal | undefined {
        return FROM_DIRECTION[direction];
    }

    /** Where an entity looks, from its yaw (0 = south, 90 = west, 180 = north, -90 = east). */
    public static fromYaw(yaw: number): Cardinal {
        return (["south", "west", "north", "east"] as const)[Math.floor((yaw * 4) / 360 + 0.5) & 3];
    }
}
