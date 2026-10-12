// 善悪（-100〜100 の整数）。ランクで効果が変わる
export const GOODNESS = {
  min: -100,
  max: 100,
  initial: 0,
  // 闇市場に入れるのはワル以下のみ
  blackmarketMax: -20,
  // 役場の寄付・ボランティア
  donationUnit: 1_000, // 寄付 1,000円ごとに +1
  volunteerGain: 3,
  volunteerPowerCost: 20,
  volunteerConditionCost: 3, // 体力の消費
  // ストリートファイト: 悪は賞金が増え、善（ヨイ以上）は負けたときの損失が減る
  fightPrizeRate: { ワル: 1.3, 激ワル: 1.5 } as Partial<Record<GoodnessRank, number>>,
  goodFightLossRate: 1 / 3,
  // 不動産: 悪（ワル以下）の店舗は強盗が来にくく、善（ヨイ以上）のマンションは滞納が減る
  badRobberyWeightRate: 0.3,
  goodArrearsWeightRate: 0.5,
} as const;

export type GoodnessRank = '激ワル' | 'ワル' | '普通' | 'ヨイ' | '激ヨイ';

export function goodnessRank(value: number): GoodnessRank {
  if (value <= -60) return '激ワル';
  if (value <= -20) return 'ワル';
  if (value < 20) return '普通';
  if (value < 60) return 'ヨイ';
  return '激ヨイ';
}

export const isBad = (value: number) => value <= -20; // ワル以下
export const isGood = (value: number) => value >= 20; // ヨイ以上

export function clampGoodness(value: number): number {
  return Math.min(GOODNESS.max, Math.max(GOODNESS.min, Math.round(value)));
}
