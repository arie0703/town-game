import { Hono } from 'hono';
import type { Abilities, AbilityKey } from '../../shared/abilities';
import { TRAINING } from '../../shared/config';
import { describeGain } from '../../shared/master/effects';
import { findTraining } from '../../shared/master/trainings';
import type { ActionResult } from '../../shared/types';
import { formatKg } from '../../shared/weight';
import { requireAuth, type AuthEnv } from '../auth';
import { GameError } from '../game/errors';
import { addAbilities, runAction } from '../game/player';
import { addWeight, assertStamina, spendCondition } from '../game/status';

// 体力で上昇量を補正する（最低 +1）
function scaledGain(gain: Partial<Abilities>, condition: number): Partial<Abilities> {
  const { rate } = TRAINING.rateByCondition.find((r) => condition >= r.minCondition)!;
  const result: Partial<Abilities> = {};
  for (const [key, value] of Object.entries(gain) as Array<[keyof Abilities, number]>) {
    result[key] = Math.max(1, Math.round(value * rate));
  }
  return result;
}

export const trainingRoutes = new Hono<AuthEnv>();

// ジムの種目・学校の授業を受ける
trainingRoutes.post('/training', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const training = typeof body?.trainingId === 'string' ? findTraining(body.trainingId) : undefined;
  if (!training) throw new GameError('その種目・授業はありません');
  const isGym = training.facility === 'gym';
  const powerColumn = isGym ? 'body_power' : 'brain_power';

  const result = await runAction(c.get('userId'), ({ user, abilities }) => {
    if (user[powerColumn] < training.powerCost) {
      throw new GameError(`${isGym ? '身体' : '頭脳'}パワーが足りません。休息しましょう`);
    }
    if (isGym) assertStamina(user.condition, 'トレーニングできません');
    if (user.money < training.fee) throw new GameError(isGym ? '利用料が足りません' : '授業料が足りません');

    const gain = scaledGain(training.gain, user.condition);
    const weightG = addWeight(user.weight_g, training.weight ?? 0);
    const extras = [
      training.condition ? `体力 ${training.condition > 0 ? '+' : ''}${training.condition}` : '',
      training.weight ? `体重 ${training.weight > 0 ? '+' : '-'}${formatKg(Math.abs(training.weight))}` : '',
    ].filter(Boolean);
    return {
      user: {
        money: user.money - training.fee,
        [powerColumn]: user[powerColumn] - training.powerCost,
        condition: spendCondition(user.condition, -(training.condition ?? 0)),
        weight_g: weightG,
      },
      abilities: addAbilities(abilities, gain),
      message: `${isGym ? 'ジムで' : '学校で'}${training.name}${isGym ? 'をした' : 'を受講した'}（${[describeGain(gain), ...extras].join(' / ')}）`,
      context: { trainedAbilities: Object.keys(gain) as AbilityKey[] },
    };
  }, isGym ? 'gym' : 'school');
  return c.json<ActionResult>(result);
});
