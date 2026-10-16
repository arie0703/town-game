import { Hono } from 'hono';
import { goodnessRank } from '../../shared/goodness';
import { jobName } from '../../shared/master/jobs';
import { findTitle } from '../../shared/master/titles';
import type { ResidentView } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { landValuesByOwner } from '../game/assets';

export const residentRoutes = new Hono<AuthEnv>();

// userId → 直近に獲得した称号の名前
async function latestTitleByUser(): Promise<Map<number, string>> {
  const rows = await db.selectFrom('user_titles').select(['user_id', 'title_id', 'earned_at']).orderBy('earned_at').execute();
  const result = new Map<number, string>();
  for (const row of rows) {
    const title = findTitle(row.title_id);
    if (title) result.set(row.user_id, title.name);
  }
  return result;
}

// 住民一覧（総資産ランキング順）
residentRoutes.get('/residents', requireAuth, async (c) => {
  const users = await db.selectFrom('users').select(['id', 'name', 'money', 'deposit', 'goodness', 'job_id']).execute();
  const landValues = await landValuesByOwner(db);
  const latestTitles = await latestTitleByUser();

  const residents: ResidentView[] = users
    .map((u) => ({
      rank: 0,
      id: u.id,
      name: u.name,
      jobName: jobName(u.job_id),
      totalAssets: u.money + u.deposit + (landValues.get(u.id) ?? 0),
      goodnessRank: goodnessRank(u.goodness),
      title: latestTitles.get(u.id) ?? null,
    }))
    .sort((a, b) => b.totalAssets - a.totalAssets || a.id - b.id)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return c.json(residents);
});
