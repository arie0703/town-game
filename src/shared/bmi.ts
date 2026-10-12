import { STATUS } from './config';
import type { ConsumableEffect } from './master/effects';

export function isBmiNormal(value: number): boolean {
  const [min, max] = STATUS.bmiNormalRange;
  return value >= min && value <= max;
}

// 体力回復量に BMI 補正をかける（標準範囲外なら減る）。マイナス（低下）には補正をかけない
export function conditionRecovery(base: number, bmiValue: number): number {
  if (base <= 0 || isBmiNormal(bmiValue)) return base;
  return Math.floor(base * STATUS.bmiOutOfRangeRecoveryRate);
}

// 食事・アイテム・旅行の効果を、BMI 補正後の実際の値にする（表示とメッセージを実態に合わせるため）
export function effectForBmi<T extends ConsumableEffect>(effect: T, bmiValue: number): T {
  if (!effect.condition) return effect;
  return { ...effect, condition: conditionRecovery(effect.condition, bmiValue) };
}
