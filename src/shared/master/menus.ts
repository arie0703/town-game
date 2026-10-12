import type { ConsumableEffect } from './effects';

// 食堂・居酒屋のメニュー。drink: お酒（体力が満タンでも飲める）
export type Menu = {
  id: string;
  name: string;
  price: number;
  shop: 'cafeteria' | 'izakaya';
  drink?: boolean;
  effect: ConsumableEffect;
};

export const MENUS: readonly Menu[] = [
  // 食堂: どのメニューも体力 +60（メニューの違いはパワー・能力・体重）
  { id: 'udon', name: 'かけうどん', price: 200, shop: 'cafeteria', effect: { condition: 60, weight: 0.5, bodyPower: 10, gain: { health: 1 } } },
  { id: 'natto_set', name: '納豆ごはん定食', price: 350, shop: 'cafeteria', effect: { condition: 60, weight: 1.5, bodyPower: 10, brainPower: 15, gain: { math: 1, health: 1 } } },
  { id: 'giga_ramen', name: 'ギガ盛りラーメン', price: 400, shop: 'cafeteria', effect: { condition: 60, weight: 2.5, bodyPower: 20, gain: { stamina: 1 } } },
  { id: 'chicken_salad_set', name: '蒸し鶏サラダ定食', price: 420, shop: 'cafeteria', effect: { condition: 60, weight: 0.6, bodyPower: 20, gain: { leg: 1, health: 1 } } },
  { id: 'teishoku', name: '日替わり定食', price: 450, shop: 'cafeteria', effect: { condition: 60, weight: 1.6, bodyPower: 20, brainPower: 10, gain: { health: 1, stamina: 1 } } },
  { id: 'salmon_set', name: '鮭の塩焼き定食', price: 500, shop: 'cafeteria', effect: { condition: 60, weight: 1.8, bodyPower: 10, brainPower: 20, gain: { japanese: 1, science: 1 } } },
  { id: 'katsudon', name: 'カツ丼', price: 800, shop: 'cafeteria', effect: { condition: 60, weight: 2.8, bodyPower: 30, gain: { power: 1, arm: 1 } } },
  { id: 'steak_set', name: 'ステーキ定食', price: 1_100, shop: 'cafeteria', effect: { condition: 60, weight: 3.0, bodyPower: 40, gain: { power: 2 } } },
  // 居酒屋: お酒（体力低下・体重増加。酔うと口が軽くなる）
  { id: 'beer', name: '生ビール', price: 500, shop: 'izakaya', drink: true, effect: { weight: 0.3, condition: -5, brainPower: 10, gain: { humor: 1, love: 1 } } },
  { id: 'highball', name: 'ハイボール', price: 450, shop: 'izakaya', drink: true, effect: { weight: 0.2, condition: -5, gain: { humor: 1 } } },
  { id: 'sake', name: '日本酒（熱燗）', price: 800, shop: 'izakaya', drink: true, effect: { weight: 0.2, condition: -10, gain: { humor: 2, love: 2 } } },
  { id: 'lemon_sour', name: 'レモンサワー', price: 400, shop: 'izakaya', drink: true, effect: { weight: 0.3, condition: -5, gain: { looks: 1 } } },
  // 居酒屋: 料理
  { id: 'edamame', name: '枝豆', price: 250, shop: 'izakaya', effect: { condition: 13, weight: 0.2, gain: { health: 1 } } },
  { id: 'yakitori', name: '焼き鳥盛り合わせ', price: 700, shop: 'izakaya', effect: { condition: 35, weight: 1.2, bodyPower: 20, gain: { power: 1, stamina: 1 } } },
  { id: 'karaage', name: '唐揚げ', price: 600, shop: 'izakaya', effect: { condition: 30, weight: 1.5, bodyPower: 15, gain: { arm: 1 } } },
  { id: 'shime_ramen', name: '〆のラーメン', price: 700, shop: 'izakaya', effect: { condition: 45, weight: 2.2, gain: { stamina: 1 } } },
];

export function menusOf(shop: Menu['shop']): Menu[] {
  return MENUS.filter((m) => m.shop === shop);
}

// 炊き出しの判定に使う、食堂で一番安いメニューの価格
export const CHEAPEST_MENU_PRICE = Math.min(...menusOf('cafeteria').map((m) => m.price));

export function findMenu(id: string): Menu | undefined {
  return MENUS.find((m) => m.id === id);
}

