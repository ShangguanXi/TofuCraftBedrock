// Minimal stand-in for @minecraft/server used by the Node smoke tests. It records subscriptions and registrations,
// and throws when scripts read world members during early execution, like the real engine does.

export const state = { earlyExecution: true, gameRules: { mobGriefing: true } };
export const subscriptions = new Map();

function signal(key) {
    return {
        subscribe(callback, options) {
            if (!subscriptions.has(key)) subscriptions.set(key, []);
            subscriptions.get(key).push({ callback, options });
            return callback;
        },
        unsubscribe() {},
    };
}
function signalGroup(prefix) {
    return new Proxy({}, { get: (_, name) => signal(`${prefix}.${String(name)}`) });
}

export function dispatch(key, event) {
    const list = subscriptions.get(key) ?? [];
    for (const { callback } of list) callback(event);
    return list.length;
}

export const queued = { run: [], interval: [], timeout: [] };
export const system = {
    beforeEvents: signalGroup("system.beforeEvents"),
    afterEvents: signalGroup("system.afterEvents"),
    currentTick: 0,
    run(callback) { queued.run.push(callback); return queued.run.length; },
    runInterval(callback) { queued.interval.push(callback); return 1000 + queued.interval.length; },
    runTimeout(callback) { queued.timeout.push(callback); return 2000 + queued.timeout.length; },
    runJob() { return 0; },
    clearRun() {},
};

const worldBase = {
    beforeEvents: signalGroup("world.beforeEvents"),
    afterEvents: signalGroup("world.afterEvents"),
};
export const world = new Proxy(worldBase, {
    get(target, prop) {
        if (prop in target) return target[prop];
        if (state.earlyExecution) throw new Error(`world.${String(prop)} read during early execution`);
        if (prop === "gameRules") return state.gameRules;
        throw new Error(`mock world has no member ${String(prop)}`);
    },
});

export const registered = { block: new Map(), item: new Map(), dimensions: [] };
export function makeStartupEvent() {
    return {
        blockComponentRegistry: { registerCustomComponent: (name, component) => registered.block.set(name, component) },
        itemComponentRegistry: { registerCustomComponent: (name, component) => registered.item.set(name, component) },
        dimensionRegistry: { registerCustomDimension: id => registered.dimensions.push(id) },
        customCommandRegistry: { registerCommand() {}, registerEnum() {} },
        worldClockRegistry: { registerClock() {} },
    };
}

export class Entity {
    constructor(typeId = "minecraft:zombie") { this.typeId = typeId; }
}
export class Player extends Entity {
    constructor() { super("minecraft:player"); }
}
export class ItemStack {
    constructor(typeId, amount = 1) {
        if (amount < 1 || amount > 255) throw new Error(`invalid amount ${amount}`);
        this.typeId = typeId;
        this.amount = amount;
    }
}
export class BlockPermutation {}
export class BiomeType {}
export class Block {}
export class StartupEvent {}
export const GameMode = { Adventure: "Adventure", Creative: "Creative", Spectator: "Spectator", Survival: "Survival" };
export const Direction = { Down: "Down", East: "East", North: "North", South: "South", Up: "Up", West: "West" };
