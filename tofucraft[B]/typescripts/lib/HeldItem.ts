import {
    EntityEquippableComponent,
    EntityInventoryComponent,
    EquipmentSlot,
    GameMode,
    ItemDurabilityComponent,
    ItemEnchantableComponent,
    ItemStack,
    Player,
    Vector3
} from "@minecraft/server";

/**
 * Helpers for the item in a player's main hand.
 */
export class HeldItem {
    public static isCreative(player: Player): boolean {
        return player.getGameMode() === GameMode.Creative;
    }

    private static equipment(player: Player): EntityEquippableComponent | undefined {
        return player.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent | undefined;
    }

    public static get(player: Player): ItemStack | undefined {
        return this.equipment(player)?.getEquipment(EquipmentSlot.Mainhand);
    }

    public static set(player: Player, itemStack?: ItemStack): void {
        this.equipment(player)?.setEquipment(EquipmentSlot.Mainhand, itemStack);
    }

    /**
     * Uses up items from the held stack. Creative players keep theirs.
     */
    public static consume(player: Player, amount: number = 1): void {
        if (this.isCreative(player)) return;
        const held = this.get(player);
        if (!held) return;
        if (held.amount <= amount) {
            this.set(player, undefined);
        } else {
            held.amount -= amount;
            this.set(player, held);
        }
    }

    /**
     * Turns one held item into `result`, like filling a bucket or a bottle: the stack becomes the result when it was
     * the last item, otherwise the result goes to the inventory (or drops at `dropAt`).
     */
    public static exchange(player: Player, result: ItemStack, dropAt?: Vector3): void {
        const held = this.get(player);
        if (!held) return;
        if (held.amount <= 1) {
            this.set(player, result);
            return;
        }
        held.amount -= 1;
        this.set(player, held);
        this.give(player, result, dropAt);
    }

    /**
     * Adds an item to the inventory; whatever does not fit is dropped.
     */
    public static give(player: Player, itemStack: ItemStack, dropAt?: Vector3): void {
        const container = (player.getComponent(EntityInventoryComponent.componentId) as EntityInventoryComponent | undefined)?.container;
        const leftover = container ? container.addItem(itemStack) : itemStack;
        if (leftover) player.dimension.spawnItem(leftover, dropAt ?? player.location);
    }

    /**
     * Damages the held tool like vanilla (Unbreaking may save it); breaks it when it runs out. Creative players never
     * damage their tools.
     */
    public static damage(player: Player, amount: number = 1): void {
        if (this.isCreative(player)) return;
        const held = this.get(player);
        const durability = held?.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent | undefined;
        if (!held || !durability) return;
        const enchantable = held.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent | undefined;
        const unbreaking = enchantable?.getEnchantment("unbreaking")?.level ?? 0;
        for (let i = 0; i < amount; i++) {
            if (Math.random() * 100 >= durability.getDamageChance(unbreaking)) continue;
            if (durability.damage >= durability.maxDurability) {
                this.set(player, undefined);
                player.dimension.playSound("random.break", player.location);
                return;
            }
            durability.damage += 1;
        }
        this.set(player, held);
    }
}
