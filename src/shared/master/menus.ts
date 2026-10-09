import type { ConsumableEffect } from './effects';
import { describeEffect } from './effects';

export type Menu = { id: string; name: string; price: number; effect: ConsumableEffect & { fullness: number } };

// 食堂のメニュー（同じ回復量ならお店の食事アイテムより安い）
export const MENUS: readonly Menu[] = [
  { id: 'udon', name: 'かけうどん', price: 200, effect: { fullness: 20, weight: 0.5, bodyPower: 10, condition: 5, gain: { health: 1 } } },
  { id: 'giga_ramen', name: 'ギガ盛りラーメン', price: 400, effect: { fullness: 60, weight: 2.5, bodyPower: 20, condition: -5, gain: { stamina: 1 } } },
  { id: 'teishoku', name: '日替わり定食', price: 450, effect: { fullness: 40, weight: 1.6, bodyPower: 20, brainPower: 10, condition: 10, gain: { health: 1, stamina: 1 } } },
  { id: 'katsudon', name: 'カツ丼', price: 800, effect: { fullness: 60, weight: 2.8, bodyPower: 30, gain: { power: 1, arm: 1 } } },
  { id: 'steak_set', name: 'ステーキ定食', price: 1_100, effect: { fullness: 70, weight: 3.0, bodyPower: 40, condition: 15, gain: { power: 2 } } },
];

export const CHEAPEST_MENU_PRICE = Math.min(...MENUS.map((m) => m.price));

export function findMenu(id: string): Menu | undefined {
  return MENUS.find((m) => m.id === id);
}

export function describeMenu(menu: Menu): string {
  return describeEffect(menu.effect);
}
