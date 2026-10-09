import type { ConsumableEffect } from './effects';
import { describeEffect } from './effects';

// type はお店での分類の目安。効果はどの種類にも付けられるが、満腹度（fullness）は食事のみ
export type ItemEffect =
  | ({ type: 'food'; fullness: number } & ConsumableEffect)
  | ({ type: 'ability' | 'recovery'; fullness?: never } & ConsumableEffect);

export type Item = { id: string; name: string; price: number; effect: ItemEffect };

export const ITEM_TYPE_LABEL = { food: '食事', ability: '能力アップ', recovery: '回復' } as const;

// アイテムマスタ
export const ITEMS: readonly Item[] = [
  // 食事
  { id: 'bread', name: 'パン', price: 300, effect: { type: 'food', fullness: 20, weight: 0.8, bodyPower: 10, condition: 5, gain: { stamina: 1 } } },
  { id: 'spicy_noodle', name: '激辛カップ麺', price: 150, effect: { type: 'food', fullness: 30, weight: 0.7, condition: -10, gain: { humor: 1 } } },
  { id: 'bento', name: 'お弁当', price: 600, effect: { type: 'food', fullness: 40, weight: 1.5, bodyPower: 20, brainPower: 10, condition: 10, gain: { health: 1 } } },
  { id: 'steak', name: 'ステーキ', price: 1_500, effect: { type: 'food', fullness: 70, weight: 3.0, bodyPower: 40, condition: 15, gain: { power: 2, arm: 1 } } },
  // 能力アップ
  { id: 'math_book', name: '数学の参考書', price: 2_000, effect: { type: 'ability', gain: { math: 5 } } },
  { id: 'dictionary', name: '国語辞典', price: 2_000, effect: { type: 'ability', gain: { japanese: 5 } } },
  { id: 'history_comic', name: '歴史漫画', price: 1_500, effect: { type: 'ability', brainPower: 10, gain: { social: 4 } } },
  { id: 'protein', name: 'プロテイン', price: 2_000, effect: { type: 'ability', bodyPower: 30, weight: 0.2, gain: { power: 5 } } },
  { id: 'fashion_mag', name: 'ファッション誌', price: 1_500, effect: { type: 'ability', gain: { looks: 4 } } },
  { id: 'comedy_dvd', name: 'お笑いDVD', price: 1_500, effect: { type: 'ability', brainPower: 20, gain: { humor: 5 } } },
  { id: 'love_song', name: 'ラブソングCD', price: 1_500, effect: { type: 'ability', condition: 10, gain: { love: 5 } } },
  // 回復
  { id: 'energy_drink', name: '栄養ドリンク', price: 400, effect: { type: 'recovery', bodyPower: 50, brainPower: 50, gain: { stamina: 1 } } },
  { id: 'bath_salt', name: '入浴剤', price: 600, effect: { type: 'recovery', condition: 30, gain: { looks: 1, health: 1 } } },
  { id: 'elixir', name: '高級ドリンク', price: 1_500, effect: { type: 'recovery', bodyPower: 100, brainPower: 100, condition: 30, gain: { stamina: 2, health: 2 } } },
];

export function findItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

export function describeItem(item: Item): string {
  return describeEffect(item.effect);
}
