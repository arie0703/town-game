import { ABILITIES, type Abilities, type AbilityCategory } from '../../shared/abilities';
import { LIMITS, STATUS } from '../../shared/config';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function categoryTotal(abilities: Abilities, category: AbilityCategory): number {
  return ABILITIES.filter((a) => a.category === category).reduce((sum, a) => sum + abilities[a.key], 0);
}

// パワー最大値 = カテゴリ合計（身体パワーは身体合計、頭脳パワーは頭脳合計）
export function maxPowers(abilities: Abilities): { body: number; brain: number } {
  return {
    body: categoryTotal(abilities, 'body'),
    brain: categoryTotal(abilities, 'brain'),
  };
}

// BMI = 体重(kg) ÷ 身長(m)²。小数第1位まで
export function bmi(heightCm: number, weightKg: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function isBmiNormal(value: number): boolean {
  const [min, max] = STATUS.bmiNormalRange;
  return value >= min && value <= max;
}

// コンディション回復量に BMI 補正をかける（標準範囲外なら減る）
export function conditionRecovery(base: number, bmiValue: number): number {
  return isBmiNormal(bmiValue) ? base : Math.floor(base * STATUS.bmiOutOfRangeRecoveryRate);
}

// 行動したときの空腹度・コンディションの変化（各アクション共通）
// 空腹度を hungerCost 減らし、減らす前の空腹度が閾値未満ならコンディションも下げる
export function afterAction(
  state: { hunger: number; condition: number },
  hungerCost: number,
): { hunger: number; condition: number } {
  const penalty = state.hunger < STATUS.hungryThreshold ? STATUS.hungryConditionPenalty : 0;
  return {
    hunger: clamp(state.hunger - hungerCost, 0, LIMITS.hungerMax),
    condition: clamp(state.condition - penalty, 0, LIMITS.conditionMax),
  };
}
