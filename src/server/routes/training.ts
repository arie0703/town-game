import { Hono } from 'hono';
import type { Abilities } from '../../shared/abilities';
import { LIMITS, TRAINING } from '../../shared/config';
import { describeGain } from '../../shared/master/effects';
import { findTraining } from '../../shared/master/trainings';
import type { ActionResult } from '../../shared/types';
import { formatKg } from '../../shared/weight';
import { requireAuth, type AuthEnv } from '../auth';
import { GameError } from '../game/errors';
import { addAbilities, runAction } from '../game/player';
import { addWeight, afterAction, clamp } from '../game/status';

// コンディションで上昇量を補正する（最低 +1）
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

  const message = await runAction(c.get('userId'), ({ user, abilities }) => {
    if (user[powerColumn] < training.powerCost) {
      throw new GameError(`${isGym ? '身体' : '頭脳'}パワーが足りません。休息しましょう`);
    }
    if (user.money < training.fee) throw new GameError(isGym ? '利用料が足りません' : '授業料が足りません');

    const gain = scaledGain(training.gain, user.condition);
    const after = afterAction(user, training.fullnessCost);
    const weightG = addWeight(user.weight_g, training.weight ?? 0);
    const extras = [
      training.condition ? `コンディション ${training.condition > 0 ? '+' : ''}${training.condition}` : '',
      training.weight ? `体重 ${training.weight > 0 ? '+' : '-'}${formatKg(Math.abs(training.weight))}` : '',
    ].filter(Boolean);
    return {
      user: {
        money: user.money - training.fee,
        [powerColumn]: user[powerColumn] - training.powerCost,
        fullness: after.fullness,
        condition: clamp(after.condition + (training.condition ?? 0), 0, LIMITS.conditionMax),
        weight_g: weightG,
      },
      abilities: addAbilities(abilities, gain),
      message: `${isGym ? 'ジムで' : '学校で'}${training.name}${isGym ? 'をした' : 'を受講した'}（${[describeGain(gain), ...extras].join(' / ')}）`,
    };
  });
  return c.json<ActionResult>({ message });
});
