export type Menu = { id: string; name: string; price: number; hunger: number; weight: number };

// 食堂のメニュー（同じ回復量ならお店の食事アイテムより安い）
export const MENUS: readonly Menu[] = [
  { id: 'udon', name: 'かけうどん', price: 200, hunger: 20, weight: 0 },
  { id: 'teishoku', name: '日替わり定食', price: 450, hunger: 40, weight: 1 },
  { id: 'katsudon', name: 'カツ丼', price: 800, hunger: 60, weight: 2 },
  { id: 'steak_set', name: 'ステーキ定食', price: 1_100, hunger: 70, weight: 2 },
];

export const CHEAPEST_MENU_PRICE = Math.min(...MENUS.map((m) => m.price));

export function findMenu(id: string): Menu | undefined {
  return MENUS.find((m) => m.id === id);
}
