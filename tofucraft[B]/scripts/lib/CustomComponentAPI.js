import { system, } from "@minecraft/server";
// 存储待注册的组件
const blockComponents = new Map();
const itemComponents = new Map();
let registered = false;
function ensureRegistration() {
    if (registered)
        return;
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
export function blockComponent(name) {
    return function (constructor) {
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
export function itemComponent(name) {
    return function (constructor) {
        itemComponents.set(name, new constructor());
        ensureRegistration();
        return constructor;
    };
}
