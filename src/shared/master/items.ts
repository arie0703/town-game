import type { Abilities } from '../abilities';

export type ItemEffect =
  | { type: 'food'; hunger: number; weight: number }
  | { type: 'ability'; gain: Partial<Abilities> }
  | { type: 'recovery'; bodyPower?: number; brainPower?: number; condition?: number };

export type Item = { id: string; name: string; price: number; description: string; effect: ItemEffect };

export const ITEM_TYPE_LABEL = { food: '食事', ability: '能力アップ', recovery: '回復' } as const;

// アイテムマスタ
export const ITEMS: readonly Item[] = [
  { id: 'bread', name: 'パン', price: 300, description: '空腹度 +20 / 体重 +1', effect: { type: 'food', hunger: 20, weight: 1 } },
  { id: 'bento', name: 'お弁当', price: 600, description: '空腹度 +40 / 体重 +1', effect: { type: 'food', hunger: 40, weight: 1 } },
  { id: 'steak', name: 'ステーキ', price: 1_500, description: '空腹度 +70 / 体重 +2', effect: { type: 'food', hunger: 70, weight: 2 } },
  { id: 'math_book', name: '数学の参考書', price: 2_000, description: '数学 +5', effect: { type: 'ability', gain: { math: 5 } } },
  { id: 'dictionary', name: '国語辞典', price: 2_000, description: '国語 +5', effect: { type: 'ability', gain: { japanese: 5 } } },
  { id: 'history_comic', name: '歴史漫画', price: 1_500, description: '社会 +4', effect: { type: 'ability', gain: { social: 4 } } },
  { id: 'protein', name: 'プロテイン', price: 2_000, description: 'パワー +5', effect: { type: 'ability', gain: { power: 5 } } },
  { id: 'fashion_mag', name: 'ファッション誌', price: 1_500, description: 'ルックス +4', effect: { type: 'ability', gain: { looks: 4 } } },
  { id: 'comedy_dvd', name: 'お笑いDVD', price: 1_500, description: '面白さ +5', effect: { type: 'ability', gain: { humor: 5 } } },
  { id: 'love_song', name: 'ラブソングCD', price: 1_500, description: 'LOVE +5', effect: { type: 'ability', gain: { love: 5 } } },
  { id: 'energy_drink', name: '栄養ドリンク', price: 400, description: '身体パワー・頭脳パワー +50', effect: { type: 'recovery', bodyPower: 50, brainPower: 50 } },
  { id: 'bath_salt', name: '入浴剤', price: 600, description: 'コンディション +30', effect: { type: 'recovery', condition: 30 } },
  { id: 'elixir', name: '高級ドリンク', price: 1_500, description: '身体パワー・頭脳パワー +100 / コンディション +30', effect: { type: 'recovery', bodyPower: 100, brainPower: 100, condition: 30 } },
];

export function findItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}
