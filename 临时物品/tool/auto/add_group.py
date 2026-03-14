import json
import os

def determine_tool_type(data):
    """根据文件内容识别工具/装备类型"""
    item_data = data.get('minecraft:item', {})
    components = item_data.get('components', {})
    description = item_data.get('description', {})
    identifier = description.get('identifier', '').lower()
    
    # 1. 优先从 enchantable 槽位识别
    enchant_slot = components.get('minecraft:enchantable', {}).get('slot')
    if enchant_slot:
        mapping = {
            "armor_legs": "leggings",
            "armor_torso": "chestplate",
            "armor_head": "helmet",
            "armor_feet": "boots"
        }
        return mapping.get(enchant_slot, enchant_slot)

    # 2. 从 wearable 槽位识别 (针对护甲)
    wearable_slot = components.get('minecraft:wearable', {}).get('slot')
    if wearable_slot:
        if "legs" in wearable_slot: return "leggings"
        if "chest" in wearable_slot: return "chestplate"
        if "head" in wearable_slot: return "helmet"
        if "feet" in wearable_slot: return "boots"

    # 3. 从 tags 识别
    tags = components.get('minecraft:tags', {}).get('tags', [])
    for tag in tags:
        for t in ['sword', 'pickaxe', 'axe', 'shovel', 'hoe']:
            if t in tag: return t

    # 4. 从 identifier 识别
    for t in ['sword', 'pickaxe', 'axe', 'shovel', 'hoe', 'helmet', 'chestplate', 'leggings', 'boots']:
        if t in identifier:
            return t
            
    return None

def process_files(target_ns, target_cat, overwrite):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    success_count = 0
    
    print(f"\n--- 开始处理 ---")
    for root, dirs, files in os.walk(base_dir):
        for filename in files:
            if filename.lower().endswith(('.json', '.txt')):
                file_path = os.path.join(root, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    if 'minecraft:item' not in data:
                        continue

                    tool_type = determine_tool_type(data)
                    if not tool_type:
                        continue

                    description = data['minecraft:item']['description']
                    
                    # 检查是否需要操作
                    if 'menu_category' in description and not overwrite:
                        continue

                    # 构建新的结构
                    new_menu_category = {
                        "category": target_cat,
                        "group": f"{target_ns}:itemGroup.name.{tool_type}"
                    }

                    # 如果没变则跳过
                    if description.get('menu_category') == new_menu_category:
                        continue

                    description['menu_category'] = new_menu_category

                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=4, ensure_ascii=False)
                    
                    print(f"已更新: {filename} -> {tool_type}")
                    success_count += 1

                except Exception as e:
                    print(f"处理 {filename} 失败: {e}")

    print(f"\n任务完成！共修改了 {success_count} 个文件。")

def main():
    print("=== Minecraft 物品分类修改工具 ===")
    
    # 交互式输入
    ns = input("请输入想要的 Namespace (例如 'minecraft' 或 'tofucraft', 直接回车默认为 'minecraft'): ").strip()
    if not ns: ns = "minecraft"
    
    cat = input("请输入想要的 Category (例如 'equipment' 或 'items', 直接回车默认为 'equipment'): ").strip()
    if not cat: cat = "equipment"
    
    ov = input("如果文件中已有分类，是否覆盖修改? (y/n, 默认 y): ").strip().lower()
    overwrite = False if ov == 'n' else True

    print(f"\n配置确认: Namespace={ns}, Category={cat}, 强制覆盖={overwrite}")
    confirm = input("确认开始执行? (y/n): ").strip().lower()
    
    if confirm == 'y':
        process_files(ns, cat, overwrite)
    else:
        print("已取消操作。")

if __name__ == "__main__":
    main()
    input("\n按回车键退出...")