import { Hono } from 'hono';
import type { Kysely } from 'kysely';
import type { ActionResult, LoveRequestView, LoveState, UserRef } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db, type DB, type RelationshipType } from '../db';
import { addEvent } from '../events';
import { GameError } from '../game/errors';
import { findUserRef } from './me';

const TYPE_LABEL: Record<RelationshipType, string> = { date: '交際の申し込み', propose: 'プロポーズ' };

async function loadUser(executor: Kysely<DB>, id: number) {
  const user = await executor
    .selectFrom('users')
    .select(['id', 'name', 'lover_id', 'spouse_id'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!user) throw new GameError('その住民はいません');
  return user;
}

const isSingle = (u: { lover_id: number | null; spouse_id: number | null }) => u.lover_id === null && u.spouse_id === null;

async function readNumber(req: Request, key: string): Promise<number> {
  const body = await req.json().catch(() => null);
  const value = Number(body?.[key]);
  if (!Number.isInteger(value)) throw new GameError('不正なリクエストです');
  return value;
}

// 2人の間の未処理の申し込みを取り消す（別れた・結婚した等で不要になったもの）
async function cancelPendingBetween(executor: Kysely<DB>, a: number, b: number): Promise<void> {
  await executor
    .updateTable('relationship_requests')
    .set({ status: 'cancelled' })
    .where('status', '=', 'pending')
    .where((eb) =>
      eb.or([
        eb.and([eb('from_id', '=', a), eb('to_id', '=', b)]),
        eb.and([eb('from_id', '=', b), eb('to_id', '=', a)]),
      ]),
    )
    .execute();
}

async function sendRequest(fromId: number, toId: number, type: RelationshipType): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const exists = await trx
      .selectFrom('relationship_requests')
      .select('id')
      .where('from_id', '=', fromId)
      .where('to_id', '=', toId)
      .where('type', '=', type)
      .where('status', '=', 'pending')
      .executeTakeFirst();
    if (exists) throw new GameError(`すでに${TYPE_LABEL[type]}をしています。返事を待ちましょう`);

    const from = await loadUser(trx, fromId);
    const to = await loadUser(trx, toId);
    await trx
      .insertInto('relationship_requests')
      .values({ from_id: fromId, to_id: toId, type, status: 'pending', created_at: new Date().toISOString() })
      .execute();
    const verb = type === 'date' ? '交際を申し込んだ' : 'プロポーズした';
    await addEvent(trx, fromId, `${to.name}さんに${verb}`);
    await addEvent(trx, toId, `${from.name}さんから${TYPE_LABEL[type]}が届いた`);
    return `${to.name}さんに${verb}`;
  });
}

export const loveRoutes = new Hono<AuthEnv>();

loveRoutes.get('/love', requireAuth, async (c) => {
  const userId = c.get('userId');
  const me = await loadUser(db, userId);

  const requests = await db
    .selectFrom('relationship_requests as r')
    .innerJoin('users as f', 'f.id', 'r.from_id')
    .innerJoin('users as t', 't.id', 'r.to_id')
    .select(['r.id', 'r.type', 'r.from_id', 'r.to_id', 'r.created_at', 'f.name as from_name', 't.name as to_name'])
    .where('r.status', '=', 'pending')
    .where((eb) => eb.or([eb('r.from_id', '=', userId), eb('r.to_id', '=', userId)]))
    .orderBy('r.id', 'desc')
    .execute();
  const incoming: LoveRequestView[] = requests
    .filter((r) => r.to_id === userId)
    .map((r) => ({ id: r.id, type: r.type, user: { id: r.from_id, name: r.from_name }, createdAt: r.created_at }));
  const outgoing: LoveRequestView[] = requests
    .filter((r) => r.from_id === userId)
    .map((r) => ({ id: r.id, type: r.type, user: { id: r.to_id, name: r.to_name }, createdAt: r.created_at }));

  const candidates: UserRef[] = await db
    .selectFrom('users')
    .select(['id', 'name'])
    .where('id', '!=', userId)
    .where('lover_id', 'is', null)
    .where('spouse_id', 'is', null)
    .orderBy('name')
    .execute();

  const state: LoveState = {
    lover: await findUserRef(me.lover_id),
    spouse: await findUserRef(me.spouse_id),
    incoming,
    outgoing,
    candidates,
  };
  return c.json(state);
});

// 交際を申し込む（自分も相手も恋人・配偶者がいないこと）
loveRoutes.post('/love/request', requireAuth, async (c) => {
  const userId = c.get('userId');
  const toId = await readNumber(c.req.raw, 'toId');
  if (toId === userId) throw new GameError('自分には申し込めません');
  const me = await loadUser(db, userId);
  const to = await loadUser(db, toId);
  if (!isSingle(me)) throw new GameError('恋人・配偶者がいるので申し込めません');
  if (!isSingle(to)) throw new GameError(`${to.name}さんには恋人・配偶者がいます`);
  return c.json<ActionResult>({ message: await sendRequest(userId, toId, 'date') });
});

// 恋人にプロポーズする
loveRoutes.post('/love/propose', requireAuth, async (c) => {
  const userId = c.get('userId');
  const me = await loadUser(db, userId);
  if (me.lover_id === null) throw new GameError('恋人がいません');
  return c.json<ActionResult>({ message: await sendRequest(userId, me.lover_id, 'propose') });
});

// 届いた申し込みに返事をする
loveRoutes.post('/love/respond', requireAuth, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const requestId = Number(body?.requestId);
  const accept = body?.accept === true;

  const message = await db.transaction().execute(async (trx) => {
    const req = await trx
      .selectFrom('relationship_requests')
      .selectAll()
      .where('id', '=', requestId)
      .where('to_id', '=', userId)
      .where('status', '=', 'pending')
      .executeTakeFirst();
    if (!req) throw new GameError('その申し込みはありません');
    const me = await loadUser(trx, userId);
    const from = await loadUser(trx, req.from_id);

    if (!accept) {
      await trx.updateTable('relationship_requests').set({ status: 'rejected' }).where('id', '=', req.id).execute();
      await addEvent(trx, userId, `${from.name}さんの${TYPE_LABEL[req.type]}を断った`);
      await addEvent(trx, from.id, `${me.name}さんに${TYPE_LABEL[req.type]}を断られた`);
      return `${from.name}さんの${TYPE_LABEL[req.type]}を断った`;
    }

    if (req.type === 'date') {
      if (!isSingle(me)) throw new GameError('すでに恋人・配偶者がいます');
      if (!isSingle(from)) throw new GameError(`${from.name}さんにはすでに恋人・配偶者がいます`);
      await trx.updateTable('users').set({ lover_id: from.id }).where('id', '=', me.id).execute();
      await trx.updateTable('users').set({ lover_id: me.id }).where('id', '=', from.id).execute();
    } else {
      if (me.lover_id !== from.id || from.lover_id !== me.id) throw new GameError('恋人同士ではありません');
      await trx.updateTable('users').set({ lover_id: null, spouse_id: from.id }).where('id', '=', me.id).execute();
      await trx.updateTable('users').set({ lover_id: null, spouse_id: me.id }).where('id', '=', from.id).execute();
    }
    await trx.updateTable('relationship_requests').set({ status: 'accepted' }).where('id', '=', req.id).execute();
    await cancelPendingBetween(trx, me.id, from.id);

    const result = req.type === 'date' ? '恋人になった' : '結婚した';
    await addEvent(trx, me.id, `${from.name}さんと${result}`);
    await addEvent(trx, from.id, `${me.name}さんと${result}`);
    return `${from.name}さんと${result}`;
  });
  return c.json<ActionResult>({ message });
});

// 別れる / 離婚する（一方的にできる）
async function separate(userId: number, column: 'lover_id' | 'spouse_id'): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const me = await loadUser(trx, userId);
    const partnerId = me[column];
    if (partnerId === null) throw new GameError(column === 'lover_id' ? '恋人がいません' : '配偶者がいません');
    const partner = await loadUser(trx, partnerId);

    await trx.updateTable('users').set({ [column]: null }).where('id', 'in', [me.id, partner.id]).execute();
    await cancelPendingBetween(trx, me.id, partner.id);
    const verb = column === 'lover_id' ? '別れた' : '離婚した';
    await addEvent(trx, me.id, `${partner.name}さんと${verb}`);
    await addEvent(trx, partner.id, `${me.name}さんと${verb}`);
    return `${partner.name}さんと${verb}`;
  });
}

loveRoutes.post('/love/breakup', requireAuth, async (c) => {
  return c.json<ActionResult>({ message: await separate(c.get('userId'), 'lover_id') });
});

loveRoutes.post('/love/divorce', requireAuth, async (c) => {
  return c.json<ActionResult>({ message: await separate(c.get('userId'), 'spouse_id') });
});
