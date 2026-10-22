// Custom block states of the pack, so BlockPermutation.getState / withState accept them (2.x only knows vanilla names).
import { BlockStateSuperset } from "@minecraft/vanilla-data";

type TofuBlockStates = BlockStateSuperset & {
    ["tofucraft:freeze_step"]: number;
    ["tofucraft:drain_step"]: number;
    ["tofucraft:growth"]: number;
    ["tofucraft:moisture"]: number;
    ["tofucraft:pan_state"]: number;
    ["tofucraft:connect_north"]: number;
    ["tofucraft:connect_east"]: number;
    ["tofucraft:connect_south"]: number;
    ["tofucraft:connect_west"]: number;
    ["tofucraft:open"]: number;
    ["tofucraft:hinge"]: number;
    ["tofucraft:double"]: number;
    ["tofucraft:grilled_face"]: number;
};

declare module "@minecraft/server" {
    interface BlockPermutation {
        getState<T extends keyof TofuBlockStates>(stateName: T): TofuBlockStates[T] | undefined;
        withState<T extends keyof TofuBlockStates>(name: T, value: TofuBlockStates[T]): BlockPermutation;
    }
}
