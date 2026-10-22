import {
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    CustomComponentParameters,
    ItemStack
} from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { HeldItem } from "../lib/HeldItem";

interface FluidParams {
    /** The filled bucket an empty bucket turns into. */
    bucket: string;
    /** The tofu block that bittern (nigari) curdles this fluid into, if any. */
    nigari?: string;
}

/**
 * Soy milk, hell soy milk and soy sauce. Bedrock has no custom fluids, so these are still source blocks:
 * - an empty bucket scoops the fluid up (Java EventFillBucket);
 * - bittern curdles soy milk into a kinu tofu block and hell soy milk into a hell tofu block, giving the glass
 *   bottle back (Java ItemNigari; creative players keep the bittern).
 * Placing them from a bucket is the bucket's block placer; FluidBucketEvents returns the empty bucket.
 */
@blockComponent("tofucraft:fluid")
export class BlockFluidComponent implements BlockCustomComponent {
    onPlayerInteract({ block, player }: BlockComponentPlayerInteractEvent, parameters: CustomComponentParameters): void {
        if (!player) return;
        const params = parameters.params as FluidParams;
        const held = HeldItem.get(player);
        if (held?.typeId === "minecraft:bucket") {
            const center = block.center();
            block.setType("minecraft:air");
            HeldItem.exchange(player, new ItemStack(params.bucket), center);
            block.dimension.playSound("bucket.fill_water", center);
        } else if (held?.typeId === "tofucraft:nigari" && params.nigari) {
            const center = block.center();
            block.setType(params.nigari);
            block.dimension.playSound("dig.snow", center, { pitch: 0.8 });
            if (!HeldItem.isCreative(player)) HeldItem.exchange(player, new ItemStack("minecraft:glass_bottle"), center);
        }
    }
}
