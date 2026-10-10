import { Hono } from 'hono';
import { jobName } from '../../shared/master/jobs';
import type { ResidentView, UserRef } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { landValuesByOwner } from '../game/assets';

export const residentRoutes = new Hono<AuthEnv>();

// 住民一覧（総資産ランキング順）
residentRoutes.get('/residents', requireAuth, async (c) => {
  const users = await db.selectFrom('users').select(['id', 'name', 'money', 'deposit', 'job_id', 'lover_id', 'spouse_id']).execute();
  const landValues = await landValuesByOwner(db);
  const refs = new Map<number, UserRef>(users.map((u) => [u.id, { id: u.id, name: u.name }]));
  const ref = (id: number | null) => (id === null ? null : (refs.get(id) ?? null));

  const residents: ResidentView[] = users
    .map((u) => ({
      rank: 0,
      id: u.id,
      name: u.name,
      jobName: jobName(u.job_id),
      totalAssets: u.money + u.deposit + (landValues.get(u.id) ?? 0),
      lover: ref(u.lover_id),
      spouse: ref(u.spouse_id),
    }))
    .sort((a, b) => b.totalAssets - a.totalAssets || a.id - b.id)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return c.json(residents);
});
