import { ABILITIES, type Abilities, type AbilityCategory } from '../../shared/abilities';
import { hasStamina } from '../../shared/stamina';
import { GameError } from './errors';
import { BODY, LIMITS } from '../../shared/config';
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

// 体重（g）に kg 単位の増減を加える。BODY.minWeight〜maxWeight に収める
export function addWeight(weightG: number, deltaKg: number): number {
  return clamp(weightG + kgToG(deltaKg), kgToG(BODY.minWeight), kgToG(BODY.maxWeight));
}

// 身長（cm）に増減を加える。BODY.minHeight〜maxHeight に収める
export function addHeight(heightCm: number, deltaCm: number): number {
  return clamp(heightCm + deltaCm, BODY.minHeight, BODY.maxHeight);
}

export { conditionRecovery, isBmiNormal } from '../../shared/bmi';

// 体力が 0 なら行動を断る（verb: 「働けません」など）
export function assertStamina(condition: number, verb: string): void {
  if (!hasStamina(condition)) throw new GameError(`体力が残っていないので${verb}。食事か休息で回復しましょう`);
}

// 行動で体力を cost 減らす（0 未満にはしない。cost がマイナスなら回復）
export function spendCondition(condition: number, cost: number): number {
  return clamp(condition - cost, 0, LIMITS.conditionMax);
}
