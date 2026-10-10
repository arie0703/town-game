import type { ConsumableEffect } from './effects';
import { describeEffect } from './effects';

// type はお店での分類の目安。効果はどの種類にも付けられるが、満腹度（fullness）は食事のみ
export type ItemEffect =
  | ({ type: 'food'; fullness: number } & ConsumableEffect)
  | ({ type: 'ability' | 'recovery' | 'special'; fullness?: never } & ConsumableEffect);

// shop: 販売している店（お店 / 闇市場）
export type Item = { id: string; name: string; price: number; shop: 'shop' | 'blackmarket'; effect: ItemEffect };

export const ITEM_TYPE_LABEL = { food: '食事', ability: '能力アップ', recovery: '回復', special: '薬' } as const;

// アイテムマスタ
export const ITEMS: readonly Item[] = [
  // 食事
  { id: 'bread', name: 'パン', price: 300, shop: 'shop', effect: { type: 'food', fullness: 20, weight: 0.8, bodyPower: 10, condition: 5, gain: { stamina: 1 } } },
  { id: 'spicy_noodle', name: '激辛カップ麺', price: 150, shop: 'shop', effect: { type: 'food', fullness: 30, weight: 0.7, condition: -10, gain: { humor: 1 } } },
  { id: 'bento', name: 'お弁当', price: 600, shop: 'shop', effect: { type: 'food', fullness: 40, weight: 1.5, bodyPower: 20, brainPower: 10, condition: 10, gain: { health: 1 } } },
  { id: 'steak', name: 'ステーキ', price: 1_500, shop: 'shop', effect: { type: 'food', fullness: 70, weight: 3.0, bodyPower: 40, condition: 15, gain: { power: 2, arm: 1 } } },
  // 能力アップ
  { id: 'math_book', name: '数学の参考書', price: 2_000, shop: 'shop', effect: { type: 'ability', gain: { math: 5 } } },
  { id: 'dictionary', name: '国語辞典', price: 2_000, shop: 'shop', effect: { type: 'ability', gain: { japanese: 5 } } },
  { id: 'history_comic', name: '歴史漫画', price: 1_500, shop: 'shop', effect: { type: 'ability', brainPower: 10, gain: { social: 4 } } },
  { id: 'protein', name: 'プロテイン', price: 2_000, shop: 'shop', effect: { type: 'ability', bodyPower: 30, weight: 0.2, gain: { power: 5 } } },
  { id: 'fashion_mag', name: 'ファッション誌', price: 1_500, shop: 'shop', effect: { type: 'ability', gain: { looks: 4 } } },
  { id: 'comedy_dvd', name: 'お笑いDVD', price: 1_500, shop: 'shop', effect: { type: 'ability', brainPower: 20, gain: { humor: 5 } } },
  { id: 'love_song', name: 'ラブソングCD', price: 1_500, shop: 'shop', effect: { type: 'ability', condition: 10, gain: { love: 5 } } },
  // 善悪を調整するグミ
  { id: 'cocktail_gummy', name: 'カクテルグミ', price: 3_000, shop: 'shop', effect: { type: 'ability', goodness: -15, condition: 5, weight: 0.2, gain: { love: 3, looks: 2 } } },
  { id: 'fruit_gummy', name: 'フルーツグミ', price: 3_000, shop: 'shop', effect: { type: 'ability', goodness: 15, condition: 5, weight: 0.2, gain: { health: 3, music: 2 } } },
  // 回復
  { id: 'energy_drink', name: '栄養ドリンク', price: 400, shop: 'shop', effect: { type: 'recovery', bodyPower: 50, brainPower: 50, gain: { stamina: 1 } } },
  { id: 'bath_salt', name: '入浴剤', price: 600, shop: 'shop', effect: { type: 'recovery', condition: 30, gain: { looks: 1, health: 1 } } },
  { id: 'elixir', name: '高級ドリンク', price: 1_500, shop: 'shop', effect: { type: 'recovery', bodyPower: 100, brainPower: 100, condition: 30, gain: { stamina: 2, health: 2 } } },
  // 闇市場: 体重・身長を大きく変える薬
  { id: 'fat_burner', name: '脂肪燃焼カプセル', price: 8_000, shop: 'blackmarket', effect: { type: 'special', weight: -10, condition: -10, gain: { speed: 2 } } },
  { id: 'forbidden_diet', name: '禁断の痩せ薬', price: 20_000, shop: 'blackmarket', effect: { type: 'special', weight: -20, condition: -20, gain: { speed: 3, health: -5 } } },
  { id: 'fat_syrup', name: '激太りシロップ', price: 3_000, shop: 'blackmarket', effect: { type: 'special', weight: 10, gain: { stamina: 1 } } },
  { id: 'grow_milk', name: '伸長ミルク', price: 30_000, shop: 'blackmarket', effect: { type: 'special', height: 3, condition: -5, gain: { leg: 2 } } },
  { id: 'giant_elixir', name: '巨人の秘薬', price: 120_000, shop: 'blackmarket', effect: { type: 'special', height: 10, condition: -15, gain: { power: 5 } } },
  { id: 'shrink_pill', name: '縮み薬', price: 10_000, shop: 'blackmarket', effect: { type: 'special', height: -5, gain: { speed: 3 } } },
  // 闇市場: 能力が大きく上がる高価な品
  { id: 'titan_elixir', name: '怪力の秘薬', price: 100_000, shop: 'blackmarket', effect: { type: 'ability', condition: -10, gain: { power: 30, arm: 30 } } },
  { id: 'genius_jam', name: '天才のジャム', price: 80_000, shop: 'blackmarket', effect: { type: 'ability', condition: -5, gain: { math: 30, science: 20 } } },
  { id: 'charm_perfume', name: '魅惑の香水', price: 60_000, shop: 'blackmarket', effect: { type: 'ability', gain: { looks: 20, love: 20 } } },
  { id: 'laugh_charm', name: '笑いの神のお守り', price: 50_000, shop: 'blackmarket', effect: { type: 'ability', gain: { humor: 30 } } },
  // 闇市場: 怪しい食べ物
  // ブリザデイロ: 濃厚な激甘スイーツ（違法な物質入り）。コンディションは下がるが、LOVE と体重が大きく増える
  { id: 'brigadeiro', name: 'ブリザデイロ', price: 2_500, shop: 'blackmarket', effect: { type: 'food', fullness: 20, weight: 5.0, condition: -10, gain: { love: 10 } } },
  { id: 'magic_shake', name: 'マジックプロテインシェイク', price: 15_000, shop: 'blackmarket', effect: { type: 'food', fullness: 15, weight: 1.0, bodyPower: 80, condition: -5, gain: { power: 8, arm: 5 } } },
  { id: 'hemp_icecream', name: 'ヘンプアイスクリーム', price: 3_000, shop: 'blackmarket', effect: { type: 'food', fullness: 15, weight: 0.8, condition: 30, brainPower: -20, gain: { humor: 5 } } },
  { id: 'mystery_ramen', name: '謎肉ラーメン', price: 1_800, shop: 'blackmarket', effect: { type: 'food', fullness: 60, weight: 2.5, bodyPower: 40, condition: -5, gain: { stamina: 3 } } },
];

// 並び順: 種類（ITEM_TYPE_LABEL の定義順）→ マスタの定義順
const TYPE_ORDER = Object.keys(ITEM_TYPE_LABEL) as Array<ItemEffect['type']>;

export function compareItems(a: Item, b: Item): number {
  return TYPE_ORDER.indexOf(a.effect.type) - TYPE_ORDER.indexOf(b.effect.type) || ITEMS.indexOf(a) - ITEMS.indexOf(b);
}

// 販売店の商品一覧（種類順）
export function itemsOf(shop: Item['shop']): Item[] {
  return ITEMS.filter((i) => i.shop === shop).sort(compareItems);
}

export function findItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

export function describeItem(item: Item): string {
  return describeEffect(item.effect);
}
