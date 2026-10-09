import { Hono } from 'hono';
import { LIMITS, REST } from '../../shared/config';
import { yen } from '../../shared/format';
import { findJob, JOBS } from '../../shared/master/jobs';
import type { ActionResult, JobView } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { GameError } from '../game/errors';
import { jobRequirements, salary } from '../game/jobs';
import { addAbilities, loadPlayer, runAction } from '../game/player';
import { afterAction, bmi, clamp, conditionRecovery, maxPowers } from '../game/status';

const POWER_LABEL = { body: '身体パワー', brain: '頭脳パワー' } as const;

export const actionRoutes = new Hono<AuthEnv>();

// 職業一覧（就職条件と、満たしていない条件付き）
actionRoutes.get('/jobs', requireAuth, async (c) => {
  const { user, abilities } = await loadPlayer(db, c.get('userId'));
  const jobs: JobView[] = JOBS.filter((j) => j.id !== 'none').map((job) => {
    const req = jobRequirements(job, abilities, user.height, user.weight);
    return {
      id: job.id,
      name: job.name,
      baseSalary: job.baseSalary,
      powerLabel: `${POWER_LABEL[job.power.type]} ${job.power.cost}`,
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
    const { unmet } = jobRequirements(job, abilities, user.height, user.weight);
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
    const after = afterAction(user, job.hungerCost);
    return {
      user: {
        money: user.money + pay,
        [powerColumn]: user[powerColumn] - job.power.cost,
        hunger: after.hunger,
        condition: clamp(after.condition - job.conditionCost, 0, LIMITS.conditionMax),
      },
      abilities: addAbilities(abilities, job.abilityGain),
      message: `${job.name}として働き、${yen(pay)}を稼いだ`,
    };
  });
  return c.json<ActionResult>({ message });
});

actionRoutes.post('/rest', requireAuth, async (c) => {
  const message = await runAction(c.get('userId'), ({ user, abilities }) => {
    if (user.hunger <= 0) throw new GameError('お腹が空きすぎて休めません。何か食べましょう');

    const max = maxPowers(abilities);
    const isFull =
      user.body_power >= max.body && user.brain_power >= max.brain && user.condition >= LIMITS.conditionMax;
    if (isFull) throw new GameError('元気いっぱいなので休む必要はありません');

    const after = afterAction(user, REST.hungerCost);
    const recovery = conditionRecovery(REST.conditionRecovery, bmi(user.height, user.weight));
    return {
      user: {
        body_power: Math.min(max.body, user.body_power + REST.powerRecovery),
        brain_power: Math.min(max.brain, user.brain_power + REST.powerRecovery),
        hunger: after.hunger,
        condition: clamp(after.condition + recovery, 0, LIMITS.conditionMax),
      },
      message: 'ひと休みして元気を取り戻した',
    };
  });
  return c.json<ActionResult>({ message });
});
