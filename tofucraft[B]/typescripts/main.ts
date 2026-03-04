import { EntityEquippableComponent, EquipmentSlot, world, MolangVariableMap, system, ItemUseAfterEvent } from "@minecraft/server";
import { ItemAPI } from "./lib/ItemAPI";
import { EventAPI } from "./lib/EventAPI";

// Import custom components to register them
import "./components/BlockTofuKinuComponent";
import "./components/BlockTofuMomenComponent";
import "./components/BlockTofuIshiComponent";
import "./components/BlockTofuMetalComponent";
