import { ABILITIES, type Abilities, type AbilityCategory } from '../../shared/abilities';
import { BODY, LIMITS, STATUS } from '../../shared/config';
import { kgToG } from '../../shared/weight';

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
export function bmi(heightCm: number, weightG: number): number {
  const m = heightCm / 100;
  return Math.round((weightG / 1000 / (m * m)) * 10) / 10;
}

// 体重（g）に kg 単位の増減を加える。下限は BODY.minWeight
export function addWeight(weightG: number, deltaKg: number): number {
  return Math.max(kgToG(BODY.minWeight), weightG + kgToG(deltaKg));
}

export function isBmiNormal(value: number): boolean {
  const [min, max] = STATUS.bmiNormalRange;
  return value >= min && value <= max;
}

// コンディション回復量に BMI 補正をかける（標準範囲外なら減る）。マイナス（低下）には補正をかけない
export function conditionRecovery(base: number, bmiValue: number): number {
  if (base <= 0 || isBmiNormal(bmiValue)) return base;
  return Math.floor(base * STATUS.bmiOutOfRangeRecoveryRate);
}

// 行動したときの満腹度・コンディションの変化（各アクション共通）
// 満腹度を fullnessCost 減らし、減らす前の満腹度が閾値未満ならコンディションも下げる
export function afterAction(
  state: { fullness: number; condition: number },
  fullnessCost: number,
): { fullness: number; condition: number } {
  const penalty = state.fullness < STATUS.lowFullnessThreshold ? STATUS.lowFullnessConditionPenalty : 0;
  return {
    fullness: clamp(state.fullness - fullnessCost, 0, LIMITS.fullnessMax),
    condition: clamp(state.condition - penalty, 0, LIMITS.conditionMax),
  };
}
