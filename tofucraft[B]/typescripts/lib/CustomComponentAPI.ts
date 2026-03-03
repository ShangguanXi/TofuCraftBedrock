import {
    system,
    BlockCustomComponent,
    ItemCustomComponent,
} from "@minecraft/server";

// 存储待注册的组件
const blockComponents: Map<string, BlockCustomComponent> = new Map();
const itemComponents: Map<string, ItemCustomComponent> = new Map();
let registered = false;

function ensureRegistration(): void {
    if (registered) return;
    registered = true;

    system.beforeEvents.startup.subscribe((event) => {
        for (const [name, component] of blockComponents) {
            event.blockComponentRegistry.registerCustomComponent(name, component);
        }
        for (const [name, component] of itemComponents) {
            event.itemComponentRegistry.registerCustomComponent(name, component);
        }
    });
}

/**
 * 方块自定义组件类装饰器
 *
 * @param name 组件标识符（需要命名空间，如 "tofucraft:my_block"）
 *
 * @example
 * ```ts
 * @blockComponent("tofucraft:grilled_tofu")
 * export class GrilledTofuComponent implements BlockCustomComponent {
 *     onPlayerInteract(arg: BlockComponentPlayerInteractEvent, param: CustomComponentParameters): void {
 *         // ...
 *     }
 * }
 * ```
 */
export function blockComponent(name: string) {
    return function <T extends { new (...args: any[]): BlockCustomComponent }>(constructor: T) {
        blockComponents.set(name, new constructor());
        ensureRegistration();
        return constructor;
    };
}

/**
 * 物品自定义组件类装饰器
 *
 * @param name 组件标识符（需要命名空间，如 "tofucraft:my_item"）
 *
 * @example
 * ```ts
 * @itemComponent("farmersdelight:cookable")
 * export class CookableComponent implements ItemCustomComponent {
 *     onUseOn(args: ItemComponentUseOnEvent, param: CustomComponentParameters): void {
 *         // ...
 *     }
 * }
 * ```
 */
export function itemComponent(name: string) {
    return function <T extends { new (...args: any[]): ItemCustomComponent }>(constructor: T) {
        itemComponents.set(name, new constructor());
        ensureRegistration();
        return constructor;
    };
}
