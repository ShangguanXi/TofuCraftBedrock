var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ItemStack } from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { HeldItem } from "../lib/HeldItem";
/**
 * Soy milk, hell soy milk and soy sauce. Bedrock has no custom fluids, so these are still source blocks:
 * - an empty bucket scoops the fluid up (Java EventFillBucket);
 * - bittern curdles soy milk into a kinu tofu block and hell soy milk into a hell tofu block, giving the glass
 *   bottle back (Java ItemNigari; creative players keep the bittern).
 * Placing them from a bucket is the bucket's block placer; FluidBucketEvents returns the empty bucket.
 */
let BlockFluidComponent = class BlockFluidComponent {
    onPlayerInteract({ block, player }, parameters) {
        if (!player)
            return;
        const params = parameters.params;
        const held = HeldItem.get(player);
        if (held?.typeId === "minecraft:bucket") {
            const center = block.center();
            block.setType("minecraft:air");
            HeldItem.exchange(player, new ItemStack(params.bucket), center);
            block.dimension.playSound("bucket.fill_water", center);
        }
        else if (held?.typeId === "tofucraft:nigari" && params.nigari) {
            const center = block.center();
            block.setType(params.nigari);
            block.dimension.playSound("dig.snow", center, { pitch: 0.8 });
            if (!HeldItem.isCreative(player))
                HeldItem.exchange(player, new ItemStack("minecraft:glass_bottle"), center);
        }
    }
};
BlockFluidComponent = __decorate([
    blockComponent("tofucraft:fluid")
], BlockFluidComponent);
export { BlockFluidComponent };
