import { Direction, system, world } from "@minecraft/server";
import { HeldItem } from "../lib/HeldItem";
const DOUBLE = "tofucraft:double";
const HALF = "minecraft:vertical_half";
const OFFSETS = {
    [Direction.Up]: { x: 0, y: 1, z: 0 },
    [Direction.Down]: { x: 0, y: -1, z: 0 },
    [Direction.North]: { x: 0, y: 0, z: -1 },
    [Direction.South]: { x: 0, y: 0, z: 1 },
    [Direction.East]: { x: 1, y: 0, z: 0 },
    [Direction.West]: { x: -1, y: 0, z: 0 },
};
const isTofuSlab = (typeId) => typeId.startsWith("tofucraft:") && typeId.endsWith("_slab");
const isSingle = (block, slab) => block?.typeId === slab && block.permutation.getState(DOUBLE) === 0;
/**
 * The slab that a slab of type `slab`, used on `face` of `block` at `faceLocation`, completes into a double slab:
 * the clicked slab itself when clicked on its open side, or a single slab in the cell the new half would go to.
 */
export function slabToComplete(block, face, faceLocation, slab) {
    if (isSingle(block, slab)) {
        const half = block.permutation.getState(HALF);
        if ((half === "bottom" && face === Direction.Up) || (half === "top" && face === Direction.Down))
            return block;
    }
    const target = block.offset(OFFSETS[face]);
    if (!target || !isSingle(target, slab))
        return undefined;
    // faceLocation is relative to the clicked block; accept absolute coordinates too.
    let y = faceLocation.y;
    if (y < 0 || y > 1)
        y -= block.location.y;
    const newHalf = face === Direction.Up ? "bottom" : face === Direction.Down ? "top" : y >= 0.5 ? "top" : "bottom";
    return target.permutation.getState(HALF) !== newHalf ? target : undefined;
}
/** Turns a single slab into a double slab and uses up the slab the player holds. */
export function completeSlab(block, player, slab) {
    if (!isSingle(block, slab))
        return;
    const held = HeldItem.get(player);
    if (!HeldItem.isCreative(player) && held?.typeId !== slab)
        return;
    block.setPermutation(block.permutation.withState(DOUBLE, 1));
    if (block.isWaterlogged)
        block.setWaterlogged(false);
    HeldItem.consume(player, 1);
    block.dimension.playSound("use.snow", block.center());
}
/**
 * Tofu slabs stack into double slabs like vanilla ones (Java ItemSlab): using a slab on the open side of the same
 * slab, or into a cell that holds its other half. Cancels the normal placement and merges on the next tick.
 */
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const slab = event.itemStack?.typeId;
    if (!slab || !isTofuSlab(slab))
        return;
    const target = slabToComplete(event.block, event.blockFace, event.faceLocation, slab);
    if (!target)
        return;
    event.cancel = true;
    const { player } = event;
    const { dimension, location } = target;
    system.run(() => completeSlab(dimension.getBlock(location), player, slab));
});
