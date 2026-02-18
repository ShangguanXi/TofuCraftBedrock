import { Block, Container, Entity, GameMode, ItemStack, Player, Vector3 } from "@minecraft/server";
import { RandomAPI } from "./RandomAPI";

export class ItemAPI {
    /**
     * 获取玩家背包容器（私有辅助方法）
     * @param player 目标玩家
     * @returns 玩家的背包容器，如果无法获取则返回 undefined
     */
    private static getContainer(player: Player): Container | undefined {
        return player.getComponent("inventory")?.container;
    }

    /**
     * 检查玩家是否为创造模式
     * @param player 目标玩家
     * @returns 是否为创造模式
     */
    private static isCreative(player: Player): boolean {
        return player.getGameMode() === GameMode.Creative;
    }

    /**
     * 将物品标识符或物品堆栈统一转换为 ItemStack
     * @param item 物品标识符或物品堆栈
     * @param amount 数量（仅当 item 为字符串时有效）
     * @returns ItemStack 实例
     */
    private static toItemStack(item: string | ItemStack, amount: number = 1): ItemStack {
        return item instanceof ItemStack ? item : new ItemStack(item, amount);
    }

    /**
     * 减少玩家物品的耐久度
     * @param player 要减少物品耐久的玩家
     * @param slot 要减少耐久的格子索引
     * @param damage 要减少的耐久值，默认为 1
     * @returns 实际减少的耐久值，如果物品损坏返回 undefined
     */
    public static damage(player: Player, slot: number, damage: number = 1): number | undefined {
        if (this.isCreative(player)) return;

        const container = this.getContainer(player);
        if (!container) return;

        const itemStack = container.getItem(slot);
        if (!itemStack) return;

        const durability = itemStack.getComponent("minecraft:durability");
        if (!durability) return;

        const newDamage = durability.damage + damage;
        
        if (newDamage < durability.maxDurability) {
            durability.damage = newDamage;
            container.setItem(slot, itemStack);
            return damage;
        } else {
            // 物品损坏
            player.dimension.playSound("random.break", player.location);
            container.setItem(slot, undefined);
            return undefined;
        }
    }

    /**
     * 替换玩家槽位中的物品（消耗原物品并添加新物品）
     * @param player 要替换物品的玩家
     * @param slot 要替换的格子索引
     * @param newItemStack 新的物品堆栈
     * @returns 是否替换成功
     */
    public static replace(player: Player, slot: number, newItemStack: ItemStack): boolean {
        const container = this.getContainer(player);
        if (!container) return false;

        const itemStack = container.getItem(slot);
        if (!itemStack) return false;

        container.addItem(newItemStack);

        if (!this.isCreative(player)) {
            if (itemStack.amount <= 1) {
                container.setItem(slot, undefined);
            } else {
                itemStack.amount -= 1;
                container.setItem(slot, itemStack);
            }
        }
        return true;
    }

    /**
     * 清除玩家指定槽位的物品
     * @param player 要清除物品的玩家
     * @param slot 要清除的物品格子索引
     * @param amount 要清除的物品数量，默认为 1
     * @returns 是否清除成功
     */
    public static clear(player: Player, slot: number, amount: number = 1): boolean {
        if (this.isCreative(player)) return true;

        const container = this.getContainer(player);
        if (!container) return false;

        const itemStack = container.getItem(slot);
        if (!itemStack) return false;

        const newAmount = itemStack.amount - amount;
        
        if (newAmount <= 0) {
            container.setItem(slot, undefined);
        } else {
            itemStack.amount = newAmount;
            container.setItem(slot, itemStack);
        }
        return true;
    }

    /**
     * 在目标位置生成物品实体
     * @param target 生成物品的目标（方块或实体）
     * @param item 要生成的物品标识符或物品堆栈
     * @param amount 要生成的物品数量，默认为 1（当 item 为 ItemStack 时忽略此参数）
     * @param location 生成物品的坐标，默认根据目标类型自动选择
     */
    public static spawn(
        target: Block | Entity,
        item: string | ItemStack,
        amount: number = 1,
        location?: Vector3
    ): void {
        const itemStack = this.toItemStack(item, amount);
        const spawnLocation = location ?? this.getSpawnLocation(target);
        
        target.dimension.spawnItem(itemStack, spawnLocation);
    }

    /**
     * 根据目标类型获取默认生成位置
     * @param target 方块或实体目标
     * @returns 生成坐标
     */
    private static getSpawnLocation(target: Block | Entity): Vector3 {
        if (target instanceof Block) {
            // 随机选择方块中心或底部中心，增加物品掉落的自然感
            return RandomAPI.probability(50) ? target.center() : target.bottomCenter();
        }
        return target.location;
    }

    /**
     * 向玩家背包添加物品
     * @param player 要添加物品的玩家
     * @param item 要添加的物品标识符或物品堆栈
     * @param amount 要添加的物品数量，默认为 1（当 item 为 ItemStack 时忽略此参数）
     * @returns 是否添加成功
     */
    public static add(player: Player, item: string | ItemStack, amount: number = 1): ItemStack | undefined {
        const container = this.getContainer(player);
        if (!container) return undefined;
        const itemStack = this.toItemStack(item, amount);
        return container.addItem(itemStack);
       
    }

    /**
     * 检查玩家指定槽位是否有物品
     * @param player 目标玩家
     * @param slot 槽位索引
     * @returns 是否有物品
     */
    public static hasItem(player: Player, slot: number): boolean {
        const container = this.getContainer(player);
        return container?.getItem(slot) !== undefined;
    }

    /**
     * 获取玩家指定槽位的物品
     * @param player 目标玩家
     * @param slot 槽位索引
     * @returns 物品堆栈，如果没有物品则返回 undefined
     */
    public static getItem(player: Player, slot: number): ItemStack | undefined {
        return this.getContainer(player)?.getItem(slot);
    }
}