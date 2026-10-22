import { Block, BlockComponentRedstoneUpdateEvent } from "@minecraft/server";

export const OPEN = "tofucraft:open";

/** Open and close sounds of a door, trapdoor or fence gate. */
export interface OpenSounds {
    open: string;
    close: string;
}

/**
 * Shared behaviour of doors, trapdoors and fence gates (the "tofucraft:open" state).
 */
export class Openable {
    public static isOpen(block: Block): boolean {
        return block.permutation.getState(OPEN) === 1;
    }

    /**
     * Opens or closes the block, every part of it for a door, and plays the sound. Returns false when it already was.
     */
    public static setOpen(block: Block, open: boolean, sounds: OpenSounds): boolean {
        const value = open ? 1 : 0;
        let changed = false;
        for (const part of block.getParts() ?? [block]) {
            if (part.permutation.getState(OPEN) === value) continue;
            part.setPermutation(part.permutation.withState(OPEN, value));
            changed = true;
        }
        if (changed) block.dimension.playSound(open ? sounds.open : sounds.close, block.center());
        return changed;
    }

    /**
     * Java opens powered doors and closes unpowered ones on every neighbour update. Here the block follows the signal
     * only when it switches on or off, so a door opened by hand stays open next to an unpowered wire.
     */
    public static onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent, sounds: OpenSounds): void {
        const powered = event.powerLevel > 0;
        if (powered === event.previousPowerLevel > 0) return;
        this.setOpen(event.block, powered, sounds);
    }
}
