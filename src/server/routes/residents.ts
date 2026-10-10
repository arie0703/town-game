import { Hono } from 'hono';
import { goodnessRank } from '../../shared/goodness';
import { jobName } from '../../shared/master/jobs';
import type { ResidentView } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { landValuesByOwner } from '../game/assets';

export const residentRoutes = new Hono<AuthEnv>();

// 住民一覧（総資産ランキング順）
residentRoutes.get('/residents', requireAuth, async (c) => {
  const users = await db.selectFrom('users').select(['id', 'name', 'money', 'deposit', 'goodness', 'job_id']).execute();
  const landValues = await landValuesByOwner(db);

  const residents: ResidentView[] = users
    .map((u) => ({
      rank: 0,
      id: u.id,
      name: u.name,
      jobName: jobName(u.job_id),
      totalAssets: u.money + u.deposit + (landValues.get(u.id) ?? 0),
      goodnessRank: goodnessRank(u.goodness),
    }))
    .sort((a, b) => b.totalAssets - a.totalAssets || a.id - b.id)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return c.json(residents);
});
