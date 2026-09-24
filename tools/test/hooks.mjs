// Module hooks for the smoke tests: @minecraft/server resolves to the mock, and extension-less relative imports get
// ".js" appended (the game resolves them, Node does not).
const MOCK_SERVER = new URL("./mock-server.mjs", import.meta.url).href;

export async function resolve(specifier, context, next) {
    if (specifier === "@minecraft/server") return { url: MOCK_SERVER, shortCircuit: true };
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[mc]?js$/.test(specifier)) {
        return next(specifier + ".js", context);
    }
    return next(specifier, context);
}
