import { Hono } from 'hono';
import { LIMITS, REST } from '../../shared/config';
import { yen } from '../../shared/format';
import { findJob, JOBS } from '../../shared/master/jobs';
import type { ActionResult, JobView } from '../../shared/types';
import { formatKg, gToKg } from '../../shared/weight';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { GameError } from '../game/errors';
import { jobRequirements, salary } from '../game/jobs';
import { addAbilities, loadPlayer, runAction } from '../game/player';
import { addWeight, afterAction, clamp, maxPowers } from '../game/status';

const POWER_LABEL = { body: '身体パワー', brain: '頭脳パワー' } as const;

export const actionRoutes = new Hono<AuthEnv>();

// 職業一覧（就職条件と、満たしていない条件付き）
actionRoutes.get('/jobs', requireAuth, async (c) => {
  const { user, abilities } = await loadPlayer(db, c.get('userId'));
  const jobs: JobView[] = JOBS.filter((j) => j.id !== 'none').map((job) => {
    const req = jobRequirements(job, abilities, user.height, user.weight_g);
    return {
      id: job.id,
      name: job.name,
      baseSalary: job.baseSalary,
      powerLabel: `${POWER_LABEL[job.power.type]} ${job.power.cost}`,
      weightLoss: job.weightLoss,
      requirements: req.all,
      unmet: req.unmet,
      current: user.job_id === job.id,
    };
  });
  return c.json(jobs);
});

actionRoutes.post('/jobs/apply', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const job = typeof body?.jobId === 'string' ? findJob(body.jobId) : undefined;
  if (!job || job.id === 'none') throw new GameError('その職業はありません');

  const message = await runAction(c.get('userId'), ({ user, abilities }) => {
    if (user.job_id === job.id) throw new GameError(`すでに${job.name}です`);
    const { unmet } = jobRequirements(job, abilities, user.height, user.weight_g);
    if (unmet.length > 0) throw new GameError(`条件を満たしていません（${unmet.join('、')}）`);
    return { user: { job_id: job.id }, message: `${job.name}に転職した` };
  });
  return c.json<ActionResult>({ message });
});

actionRoutes.post('/jobs/quit', requireAuth, async (c) => {
  const message = await runAction(c.get('userId'), ({ user }) => {
    const job = findJob(user.job_id);
    if (!job || job.id === 'none') throw new GameError('今は無職です');
    return { user: { job_id: 'none' }, message: `${job.name}を退職した` };
  });
  return c.json<ActionResult>({ message });
});

actionRoutes.post('/work', requireAuth, async (c) => {
  const message = await runAction(c.get('userId'), ({ user, abilities }) => {
    const job = findJob(user.job_id);
    if (!job || job.id === 'none') throw new GameError('無職なので働けません。職業安定所で仕事を探しましょう');

    const powerColumn = job.power.type === 'body' ? 'body_power' : 'brain_power';
    if (user[powerColumn] < job.power.cost) {
      throw new GameError(`${POWER_LABEL[job.power.type]}が足りません。休息しましょう`);
    }

    const pay = salary(job, user.condition);
    const after = afterAction(user, job.fullnessCost);
    const weightG = addWeight(user.weight_g, -job.weightLoss);
    const lostKg = gToKg(user.weight_g - weightG);
    return {
      user: {
        money: user.money + pay,
        [powerColumn]: user[powerColumn] - job.power.cost,
        fullness: after.fullness,
        condition: clamp(after.condition - job.conditionCost, 0, LIMITS.conditionMax),
        weight_g: weightG,
      },
      abilities: addAbilities(abilities, job.abilityGain),
      message: `${job.name}として働き、${yen(pay)}を稼いだ${lostKg > 0 ? `（体重 -${formatKg(lostKg)}）` : ''}`,
    };
  });
  return c.json<ActionResult>({ message });
});

actionRoutes.post('/rest', requireAuth, async (c) => {
  const message = await runAction(c.get('userId'), ({ user, abilities }) => {
    if (user.fullness <= 0) throw new GameError('お腹が空きすぎて休めません。何か食べましょう');

    const max = maxPowers(abilities);
    const isFull =
      user.body_power >= max.body && user.brain_power >= max.brain && user.condition >= LIMITS.conditionMax;
    if (isFull) throw new GameError('元気いっぱいなので休む必要はありません');

    // 休息は基本の回復手段なので、BMI 補正・満腹度ペナルティはかけず常に一定量回復する
    const condition = Math.min(LIMITS.conditionMax, user.condition + REST.conditionRecovery);
    return {
      user: {
        body_power: Math.min(max.body, user.body_power + REST.powerRecovery),
        brain_power: Math.min(max.brain, user.brain_power + REST.powerRecovery),
        fullness: Math.max(0, user.fullness - REST.fullnessCost),
        condition,
      },
      message: `ひと休みして元気を取り戻した（コンディション +${condition - user.condition}、満腹度 -${Math.min(user.fullness, REST.fullnessCost)}）`,
    };
  });
  return c.json<ActionResult>({ message });
});
