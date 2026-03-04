var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { blockComponent } from "../lib/CustomComponentAPI";
/**
 * Metal Tofu Block Component
 *
 * The final hardened form of tofu, created from ishi_tofu_block over time.
 * This is the hardest tofu block variant, used for tools and armor.
 *
 * Properties:
 * - Very hard to break (requires pickaxe)
 * - High explosion resistance
 * - Can be used as a sturdy building material
 */
let BlockTofuMetalComponent = class BlockTofuMetalComponent {
    /**
     * Called when a player interacts with the block
     * Could be used for special interactions in the future
     */
    onPlayerInteract(args) {
        // Reserved for future functionality
        // e.g., right-click with empty hand to check tofu hardness
    }
};
BlockTofuMetalComponent = __decorate([
    blockComponent("tofucraft:metal_tofu_block")
], BlockTofuMetalComponent);
export { BlockTofuMetalComponent };
