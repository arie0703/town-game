import { Hono } from 'hono';
import { ABILITIES, type Abilities } from '../../shared/abilities';
import { jobLevel, jobName } from '../../shared/master/jobs';
import type { EventItem, Me, UserRef } from '../../shared/types';
import { clearLoginCookie, requireAuth, type AuthEnv } from '../auth';
import { gToKg } from '../../shared/weight';
import { db } from '../db';
import { landValueOf } from '../game/assets';
import { bmi, categoryTotal, maxPowers } from '../game/status';

const EVENTS_LIMIT = 20;

export async function findUserRef(id: number | null): Promise<UserRef | null> {
  if (id === null) return null;
  return (await db.selectFrom('users').select(['id', 'name']).where('id', '=', id).executeTakeFirst()) ?? null;
}

export async function loadMe(userId: number): Promise<Me | null> {
  const user = await db.selectFrom('users').selectAll().where('id', '=', userId).executeTakeFirst();
  if (!user) return null;
  const row = await db.selectFrom('abilities').selectAll().where('user_id', '=', userId).executeTakeFirstOrThrow();
  const abilities = Object.fromEntries(ABILITIES.map((a) => [a.key, row[a.key]])) as Abilities;
  const powers = maxPowers(abilities);
  const jobExp = await db
    .selectFrom('user_job_exp')
    .select('exp')
    .where('user_id', '=', userId)
    .where('job_id', '=', user.job_id)
    .executeTakeFirst();

  return {
    id: user.id,
    name: user.name,
    money: user.money,
    deposit: user.deposit,
    // 総資産 = 持ち金 + 預金 + 所有土地の評価額
    totalAssets: user.money + user.deposit + (await landValueOf(db, user.id)),
    job: { id: user.job_id, name: jobName(user.job_id), level: jobLevel(jobExp?.exp ?? 0) },
    bodyPower: { current: user.body_power, max: powers.body },
    brainPower: { current: user.brain_power, max: powers.brain },
    condition: user.condition,
    height: user.height,
    weight: gToKg(user.weight_g),
    bmi: bmi(user.height, user.weight_g),
    fullness: user.fullness,
    lover: await findUserRef(user.lover_id),
    spouse: await findUserRef(user.spouse_id),
    abilities,
    brainTotal: categoryTotal(abilities, 'brain'),
    bodyTotal: categoryTotal(abilities, 'body'),
    soupKitchenCount: user.soup_kitchen_count,
  };
}

export const meRoutes = new Hono<AuthEnv>();

meRoutes.get('/me', requireAuth, async (c) => {
  const me = await loadMe(c.get('userId'));
  if (!me) {
    clearLoginCookie(c);
    return c.json({ error: 'ログインしてください' }, 401);
  }
  return c.json(me);
});

meRoutes.get('/events', requireAuth, async (c) => {
  const rows = await db
    .selectFrom('events')
    .select(['id', 'message', 'created_at'])
    .where('user_id', '=', c.get('userId'))
    .orderBy('id', 'desc')
    .limit(EVENTS_LIMIT)
    .execute();
  const events: EventItem[] = rows.map((r) => ({ id: r.id, message: r.message, createdAt: r.created_at }));
  return c.json(events);
});
