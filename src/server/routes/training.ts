import { Hono } from 'hono';
import { ABILITIES, type AbilityCategory, type AbilityKey } from '../../shared/abilities';
import { TRAINING } from '../../shared/config';
import type { ActionResult } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { GameError } from '../game/errors';
import { addAbilities, runAction } from '../game/player';
import { addWeight, afterAction } from '../game/status';

function trainingGain(condition: number): number {
  return TRAINING.gainByCondition.find((g) => condition >= g.minCondition)!.gain;
}

async function readAbility(req: Request, category: AbilityCategory): Promise<{ key: AbilityKey; label: string }> {
  const body = await req.json().catch(() => null);
  const ability = ABILITIES.find((a) => a.key === body?.ability && a.category === category);
  if (!ability) throw new GameError('その科目はありません');
  return ability;
}

export const trainingRoutes = new Hono<AuthEnv>();

trainingRoutes.post('/school', requireAuth, async (c) => {
  const ability = await readAbility(c.req.raw, 'brain');
  const message = await runAction(c.get('userId'), ({ user, abilities }) => {
    if (user.brain_power < TRAINING.powerCost) throw new GameError('頭脳パワーが足りません。休息しましょう');
    if (user.money < TRAINING.fee) throw new GameError('授業料が足りません');

    const gain = trainingGain(user.condition);
    const after = afterAction(user, TRAINING.schoolFullnessCost);
    return {
      user: {
        money: user.money - TRAINING.fee,
        brain_power: user.brain_power - TRAINING.powerCost,
        fullness: after.fullness,
        condition: after.condition,
      },
      abilities: addAbilities(abilities, { [ability.key]: gain }),
      message: `学校で${ability.label}を勉強した（${ability.label} +${gain}）`,
    };
  });
  return c.json<ActionResult>({ message });
});

trainingRoutes.post('/gym', requireAuth, async (c) => {
  const ability = await readAbility(c.req.raw, 'body');
  const message = await runAction(c.get('userId'), ({ user, abilities }) => {
    if (user.body_power < TRAINING.powerCost) throw new GameError('身体パワーが足りません。休息しましょう');
    if (user.money < TRAINING.fee) throw new GameError('利用料が足りません');

    const gain = trainingGain(user.condition);
    const after = afterAction(user, TRAINING.gymFullnessCost);
    return {
      user: {
        money: user.money - TRAINING.fee,
        body_power: user.body_power - TRAINING.powerCost,
        weight_g: addWeight(user.weight_g, -TRAINING.gymWeightLoss),
        fullness: after.fullness,
        condition: after.condition,
      },
      abilities: addAbilities(abilities, { [ability.key]: gain }),
      message: `ジムで${ability.label}を鍛えた（${ability.label} +${gain}）`,
    };
  });
  return c.json<ActionResult>({ message });
});
