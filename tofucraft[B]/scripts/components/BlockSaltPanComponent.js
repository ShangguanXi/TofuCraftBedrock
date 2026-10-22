var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BlockSaltPanComponent_1;
import { ItemStack } from "@minecraft/server";
import { blockComponent } from "../lib/CustomComponentAPI";
import { HeldItem } from "../lib/HeldItem";
import { TofuBlockUtil } from "../lib/TofuBlockUtil";
const SALT_PAN = "tofucraft:salt_pan";
const STATE = "tofucraft:pan_state";
// pan_state values (Java meta 0, 1-3, 4, 8)
const EMPTY = 0;
const SALT = 4;
const BITTERN = 5;
const SIDES = [
    { state: "tofucraft:connect_north", at: (b) => b.north() },
    { state: "tofucraft:connect_east", at: (b) => b.east() },
    { state: "tofucraft:connect_south", at: (b) => b.south() },
    { state: "tofucraft:connect_west", at: (b) => b.west() },
];
/**
 * Salt Pan (Java BlockSaltPan)
 *
 * - Water bucket on an empty pan fills it and every empty pan within one block (3x3x3).
 * - Water evaporates in the sun over three stages into salt; the chance per random tick is 1 / (int(25 / rate) + 1),
 *   rate = daytime (2, night 1) * dryness (humidity < 0.2: 4, < 0.7: 2, < 0.9: 1, else 0.5)
 *        * heat (temperature < 0: 1, < 0.6: 1.5, < 1: 2, else 4), and 0 in the shade or rain.
 * - Salt: using the pan drops one salt and leaves bittern; a glass bottle takes the bittern as nigari, an empty hand
 *   pours it away.
 * Neighbouring pans hide the frame between them (connect_* states, kept up to date on place and break).
 */
let BlockSaltPanComponent = BlockSaltPanComponent_1 = class BlockSaltPanComponent {
    onPlace({ block }) {
        BlockSaltPanComponent_1.updateConnections(block);
        for (const side of SIDES) {
            const neighbour = side.at(block);
            if (neighbour?.typeId === SALT_PAN)
                BlockSaltPanComponent_1.updateConnections(neighbour);
        }
    }
    onBreak({ block }) {
        for (const side of SIDES) {
            const neighbour = side.at(block);
            if (neighbour?.typeId === SALT_PAN)
                BlockSaltPanComponent_1.updateConnections(neighbour);
        }
    }
    onPlayerInteract({ block, player }) {
        if (!player)
            return;
        const state = block.permutation.getState(STATE) ?? EMPTY;
        const held = HeldItem.get(player);
        if (state === EMPTY && held?.typeId === "minecraft:water_bucket") {
            if (!HeldItem.isCreative(player))
                HeldItem.set(player, new ItemStack("minecraft:bucket"));
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        const pan = block.offset({ x: dx, y: dy, z: dz });
                        if (pan?.typeId === SALT_PAN && (pan.permutation.getState(STATE) ?? EMPTY) === EMPTY)
                            BlockSaltPanComponent_1.setState(pan, 1);
                    }
                }
            }
            block.dimension.playSound("bucket.empty_water", block.center());
        }
        else if (state === BITTERN && held?.typeId === "minecraft:glass_bottle") {
            HeldItem.exchange(player, new ItemStack("tofucraft:nigari"), { x: block.x + 0.5, y: block.y + 1.5, z: block.z + 0.5 });
            BlockSaltPanComponent_1.setState(block, EMPTY);
            block.dimension.playSound("bottle.fill", block.center());
        }
        else if (state === BITTERN && !held) {
            BlockSaltPanComponent_1.setState(block, EMPTY);
        }
        else if (state === SALT) {
            const spread = 0.7;
            block.dimension.spawnItem(new ItemStack("tofucraft:salt"), {
                x: block.x + Math.random() * spread + (1 - spread) * 0.5,
                y: block.y + Math.random() * spread + (1 - spread) * 0.2 + 0.6,
                z: block.z + Math.random() * spread + (1 - spread) * 0.5,
            });
            BlockSaltPanComponent_1.setState(block, BITTERN);
        }
    }
    onRandomTick({ block }) {
        const state = block.permutation.getState(STATE) ?? EMPTY;
        if (state < 1 || state > 3)
            return;
        const rate = BlockSaltPanComponent_1.evaporationRate(block);
        if (rate > 0 && Math.floor(Math.random() * (Math.floor(25 / rate) + 1)) === 0)
            BlockSaltPanComponent_1.setState(block, state + 1);
    }
    /** Java BlockSaltPan.calcAdaptation. */
    static evaporationRate(block) {
        if (!TofuBlockUtil.canSeeSky(block) || TofuBlockUtil.isRaining(block.dimension))
            return 0;
        const biome = block.dimension.getBiome(block.location);
        const humidity = TofuBlockUtil.downfallOf(biome);
        const temperature = TofuBlockUtil.temperatureAt(biome, block.location.y);
        let rate = TofuBlockUtil.isDaytime() ? 2 : 1;
        rate *= humidity < 0.2 ? 4 : humidity < 0.7 ? 2 : humidity < 0.9 ? 1 : 0.5;
        rate *= temperature < 0 ? 1 : temperature < 0.6 ? 1.5 : temperature < 1 ? 2 : 4;
        return rate;
    }
    static setState(block, state) {
        block.setPermutation(block.permutation.withState(STATE, state));
    }
    static updateConnections(block) {
        let permutation = block.permutation;
        for (const side of SIDES) {
            const connected = side.at(block)?.typeId === SALT_PAN ? 1 : 0;
            if (permutation.getState(side.state) !== connected)
                permutation = permutation.withState(side.state, connected);
        }
        if (permutation !== block.permutation)
            block.setPermutation(permutation);
    }
};
BlockSaltPanComponent = BlockSaltPanComponent_1 = __decorate([
    blockComponent("tofucraft:salt_pan")
], BlockSaltPanComponent);
export { BlockSaltPanComponent };
