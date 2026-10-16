import { ABILITIES, type Abilities } from '../abilities';
import { TRAVELS } from './travels';
import type { UserState } from './states';

// 称号の判定に使う住民の状態
//   stats: 累計カウンタ（STAT_KEYS を参照）、properties: 所有物件数、totalAssets: 総資産
export type TitleContext = {
  soupKitchenCount: number;
  weightKg: number;
  goodness: number;
  abilities: Abilities;
  stats: Record<string, number>;
  properties: number;
  totalAssets: number;
  states: readonly UserState[];
  affinities: Record<string, number>; // NPC との友好度（targetId → 値）
};

// 累計カウンタのキー（user_stats.key）
export const STAT_KEYS = {
  drinks: 'drinks', // 居酒屋でお酒を飲んだ杯数
  fightWins: 'fight_wins',
  fightLosses: 'fight_losses',
  chohanAllInWins: 'chohan_all_in_wins', // 丁半で持ち金を全額賭けて勝った回数
  travel: (travelId: string) => `travel_${travelId}`, // 旅行先ごとの旅行回数
} as const;

const stat = (ctx: TitleContext, key: string) => ctx.stats[key] ?? 0;
const brainTotal = (abilities: Abilities) =>
  ABILITIES.filter((a) => a.category === 'brain').reduce((sum, a) => sum + abilities[a.key], 0);

// 称号マスタ。称号はゲーム上の効果を持たない（見た目のみ）。一度獲得したら失わない
//   description は獲得後にだけ表示する（未獲得は名前・条件とも伏せる）
export type Title = { id: string; name: string; description: string; check: (ctx: TitleContext) => boolean };

export const TITLES: readonly Title[] = [
  { id: 'soup_regular', name: '炊き出し常連', description: '炊き出しを 10 回利用した', check: (c) => c.soupKitchenCount >= 10 },
  { id: 'overnight_rich', name: '一夜成金', description: '丁半で持ち金を全額賭けて勝った', check: (c) => stat(c, STAT_KEYS.chohanAllInWins) >= 1 },
  { id: 'heavyweight', name: '重量級', description: '体重が 100kg 以上になった', check: (c) => c.weightKg >= 100 },
  { id: 'landlord', name: '地主', description: '物件を 3 件所有した', check: (c) => c.properties >= 3 },
  { id: 'millionaire', name: '長者', description: '総資産が 100万円以上になった', check: (c) => c.totalAssets >= 1_000_000 },
  { id: 'billionaire', name: '億り人', description: '総資産が 1億円以上になった', check: (c) => c.totalAssets >= 100_000_000 },
  { id: 'heavy_drinker', name: '酒豪', description: '居酒屋でお酒を 30 杯飲んだ', check: (c) => stat(c, STAT_KEYS.drinks) >= 30 },
  { id: 'undaunted', name: '不屈の挑戦者', description: 'ストリートファイトで 10 回負けた', check: (c) => stat(c, STAT_KEYS.fightLosses) >= 10 },
  { id: 'street_king', name: 'ストリートの覇者', description: 'ストリートファイトで 10 回勝った', check: (c) => stat(c, STAT_KEYS.fightWins) >= 10 },
  { id: 'genius', name: '天才', description: '頭脳合計が 300 以上になった', check: (c) => brainTotal(c.abilities) >= 300 },
  {
    id: 'world_traveler',
    name: '世界一周',
    description: 'すべての旅行先に行った',
    check: (c) => TRAVELS.every((t) => stat(c, STAT_KEYS.travel(t.id)) >= 1),
  },
  { id: 'boss', name: '組長', description: '裏組織で組長になった', check: (c) => c.states.some((s) => s.id === 'gang' && s.level >= 2) },
  { id: 'yoko_special', name: '陽子ママの特別な客', description: 'スナックで陽子ママの特別な客になった', check: (c) => (c.affinities.yoko ?? 0) >= 100 },
  { id: 'kurenai_special', name: '紅ママの特別な客', description: 'スナックで紅ママの特別な客になった', check: (c) => (c.affinities.kurenai ?? 0) >= 100 },
  { id: 'saint', name: '聖人', description: '善悪が 100 になった', check: (c) => c.goodness >= 100 },
  { id: 'villain', name: '極道', description: '善悪が -100 になった', check: (c) => c.goodness <= -100 },
];

export function findTitle(id: string): Title | undefined {
  return TITLES.find((t) => t.id === id);
}
