import {
    BlockComponentPlayerPlaceBeforeEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    Direction,
    Vector3
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";

// Flame position in the block for each "minecraft:block_face" (the top of the stick in tools/gen/shapes.mjs).
const FLAMES: Record<string, [number, number, number]> = {
    up: [0.5, 0.7, 0.5],
    north: [0.5, 0.92, 0.94],
    south: [0.5, 0.92, 0.06],
    east: [0.06, 0.92, 0.5],
    west: [0.94, 0.92, 0.5],
};
// From the new torch to the block it was placed against.
const TOWARDS_SUPPORT: Partial<Record<Direction, Vector3>> = {
    [Direction.Up]: { x: 0, y: -1, z: 0 },
    [Direction.North]: { x: 0, y: 0, z: 1 },
    [Direction.South]: { x: 0, y: 0, z: -1 },
    [Direction.East]: { x: -1, y: 0, z: 0 },
    [Direction.West]: { x: 1, y: 0, z: 0 },
};

/**
 * Tofu torches (Java BlockTofuTorch): light 14, placed on top or on the side of blocks ("minecraft:placement_filter"),
 * with the smoke and flame of a torch every 10-20 ticks ("minecraft:tick").
 */
@blockComponent("tofucraft:torch")
export class BlockTorchComponent implements BlockCustomComponent {
    beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
        // The placement filter only checks the face; a torch cannot hold another torch.
        const offset = TOWARDS_SUPPORT[event.face];
        const support = offset ? event.block.offset(offset) : undefined;
        if (!support || support.typeId.endsWith("torch")) event.cancel = true;
    }

    onTick({ block, dimension }: BlockComponentTickEvent): void {
        const [x, y, z] = FLAMES[String(block.permutation.getState("minecraft:block_face"))] ?? FLAMES.up;
        const at = { x: block.x + x, y: block.y + y, z: block.z + z };
        try {
            dimension.spawnParticle("minecraft:basic_smoke_particle", at);
            dimension.spawnParticle("minecraft:basic_flame_particle", at);
        } catch {
            // No players nearby to see it, or the chunk is unloading.
        }
    }
}
