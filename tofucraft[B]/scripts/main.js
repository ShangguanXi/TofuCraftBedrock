// Import custom components to register them
import "./components/BlockTofuKinuComponent";
import "./components/BlockTofuMomenComponent";
import "./components/BlockTofuIshiComponent";
import "./components/BlockCropComponents";
import "./components/BlockFluidComponent";
import "./components/BlockSaltPanComponent";
import "./components/BlockTofuFarmlandComponent";
import "./components/BlockFallingComponent";
import "./components/ItemSeedComponent";
import "./components/ItemConsumeEffectsComponent";
import "./components/ItemTofuHoeComponent";
import "./components/BlockFragileComponent";
import "./components/BlockSlabComponents";
import "./components/BlockFenceGateComponent";
import "./components/BlockTrapdoorComponents";
import "./components/BlockDoorComponents";
import "./components/BlockTorchComponent";
// Event subscriptions
import "./events/FluidBucketEvents";
import "./events/GrassSoybeanDrops";
import "./events/SlabMerging";
import { TofuWorld } from "./dimension/TofuWorld";
new TofuWorld();
