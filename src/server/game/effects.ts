import type { Abilities } from '../../shared/abilities';
import { LIMITS } from '../../shared/config';
import { clampGoodness } from '../../shared/goodness';
import type { ConsumableEffect } from '../../shared/master/effects';
import type { Player, PlayerChange } from './player';
import { addAbilities } from './player';
import { addHeight, addWeight, bmi, clamp, conditionRecovery, maxPowers } from './status';

// アイテム・食堂メニューの効果を反映した変更内容を返す（アイテムの個数・お金は呼び出し側で扱う）
export function applyEffect(
  { user, abilities }: Player,
  effect: ConsumableEffect,
): Required<Pick<PlayerChange, 'user' | 'abilities'>> {
  const gained = addAbilities(abilities, effect.gain);
  // 能力上昇でパワーの最大値が上がった場合は、新しい最大値まで回復できる
  const max = maxPowers({ ...abilities, ...gained } as Abilities);
  const condition = conditionRecovery(effect.condition ?? 0, bmi(user.height, user.weight_g));
  return {
    user: {
      body_power: clamp(user.body_power + (effect.bodyPower ?? 0), 0, max.body),
      brain_power: clamp(user.brain_power + (effect.brainPower ?? 0), 0, max.brain),
      condition: clamp(user.condition + condition, 0, LIMITS.conditionMax),
      weight_g: addWeight(user.weight_g, effect.weight ?? 0),
      height: addHeight(user.height, effect.height ?? 0),
      goodness: clampGoodness(user.goodness + (effect.goodness ?? 0)),
    },
    abilities: gained,
  };
}
