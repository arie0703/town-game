import { ABILITIES, type Abilities } from '../abilities';
import { yen } from '../format';
import { JOB_LINES } from './jobs';
import { findItem } from './items';

// 裏組織。所属すると状態「裏組織所属」が付き、level に階級（0 = 組員）が入る
export const GANG = {
  joinGoodnessMax: -60, // 激ワル以下でないと所属できない
  bannedJobs: JOB_LINES.teacher as readonly string[], // 所属できない職業（就いている間は門前払い）
  leaveFee: 30_000, // 足を洗うときの足抜け料
  shinogi: {
    powerCost: 30,
    conditionCost: 5, // 体力の消費
    goodness: -2,
    rateRange: [0.5, 1.5], // 基本額に掛ける振れ幅
    // シノギ中の出来事（上から順に判定）
    feud: { chance: 0.15, condition: -20 }, // 抗争に巻き込まれた
    raid: { chance: 0.03, fineRate: 0.3 }, // 警察の摘発: 持ち金の 30% を罰金で払い、強制的に脱退
  },
} as const;

// 昇進条件（仮の仕組み。値・条件は今後変える）。itemId は後で実装する特別アイテム（昇進時に消費する）
export type GangPromotion = { tribute: number; abilities?: Partial<Abilities>; itemId?: string };

export type GangRank = { name: string; shinogiBase: number; promotion?: GangPromotion };

// 階級（配列の添字 = 状態の level）。promotion はその階級に上がるための条件
export const GANG_RANKS: readonly GangRank[] = [
  { name: '組員', shinogiBase: 3_000 },
  { name: '幹部', shinogiBase: 6_000, promotion: { tribute: 5_000_000, abilities: { arm: 60, power: 60 }, itemId: 'silver_pistol' } },
  { name: '組長', shinogiBase: 10_000, promotion: { tribute: 20_000_000, abilities: { arm: 100, power: 100, social: 60 } } },
];

// 昇進条件の判定（画面とサーバーで共通）。特別アイテムの名前は伏せる
export function gangPromotionChecks(
  promotion: GangPromotion,
  { money, abilities, items }: { money: number; abilities: Abilities; items: Record<string, number> },
): Array<{ label: string; met: boolean }> {
  const checks = [{ label: `上納金 ${yen(promotion.tribute)}（持ち金から納める）`, met: money >= promotion.tribute }];
  for (const [key, min] of Object.entries(promotion.abilities ?? {}) as Array<[keyof Abilities, number]>) {
    const label = ABILITIES.find((a) => a.key === key)?.label ?? key;
    checks.push({ label: `${label} ${min}以上`, met: abilities[key] >= min });
  }
  if (promotion.itemId && findItem(promotion.itemId)) {
    checks.push({ label: '？？？を持っている', met: (items[promotion.itemId] ?? 0) > 0 });
  }
  return checks;
}
