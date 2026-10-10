import type { Kysely, Selectable, Updateable } from 'kysely';
import { ABILITIES, type Abilities } from '../../shared/abilities';
import { LIMITS } from '../../shared/config';
import type { ActionKind, EventContext } from '../../shared/master/random-events';
import type { ActionResult } from '../../shared/types';
import { db, type DB, type UsersTable } from '../db';
import { addEvent } from '../events';
import { GameError } from './errors';
import { rollRandomEvent } from './random-events';

// items: 所持アイテム（itemId → 個数）、jobExp: 職業ごとの経験値（jobId → 経験値）
export type Player = {
  user: Selectable<UsersTable>;
  abilities: Abilities;
  items: Record<string, number>;
  jobExp: Record<string, number>;
};

export type PlayerChange = {
  user?: Updateable<UsersTable>;
  abilities?: Partial<Abilities>;
  // 変更後のアイテム個数（itemId → 個数。0 なら削除）
  items?: Record<string, number>;
  // 変更後の職業ごとの経験値（jobId → 経験値）
  jobExp?: Record<string, number>;
  message: string;
  // ランダムイベントの条件・効果に使う行動の結果（稼いだ額など）
  context?: EventContext;
};

// 能力値を加算する（0 未満にはしない。上限が設定されていれば頭打ち）
export function addAbilities(base: Abilities, gain: Partial<Abilities>): Partial<Abilities> {
  const result: Partial<Abilities> = {};
  for (const [key, value] of Object.entries(gain) as Array<[keyof Abilities, number]>) {
    const next = Math.max(0, base[key] + value);
    result[key] = LIMITS.abilityMax === null ? next : Math.min(next, LIMITS.abilityMax);
  }
  return result;
}

export async function loadPlayer(executor: Kysely<DB>, userId: number): Promise<Player> {
  const user = await executor.selectFrom('users').selectAll().where('id', '=', userId).executeTakeFirst();
  if (!user) throw new GameError('住民が見つかりません');
  const row = await executor.selectFrom('abilities').selectAll().where('user_id', '=', userId).executeTakeFirstOrThrow();
  const abilities = Object.fromEntries(ABILITIES.map((a) => [a.key, row[a.key]])) as Abilities;
  const itemRows = await executor
    .selectFrom('user_items')
    .select(['item_id', 'quantity'])
    .where('user_id', '=', userId)
    .execute();
  const items = Object.fromEntries(itemRows.map((r) => [r.item_id, r.quantity]));
  const expRows = await executor.selectFrom('user_job_exp').select(['job_id', 'exp']).where('user_id', '=', userId).execute();
  const jobExp = Object.fromEntries(expRows.map((r) => [r.job_id, r.exp]));
  return { user, abilities, items, jobExp };
}

// アクション共通処理: 読み込み → 計算（fn）→ ランダムイベント → 書き戻し → 出来事ログ を1トランザクションで行う
//   kind: ランダムイベントの対象の行動の種類（省略するとイベントは起きない）
export async function runAction(
  userId: number,
  fn: (player: Player) => PlayerChange,
  kind?: ActionKind,
): Promise<ActionResult> {
  return db.transaction().execute(async (trx) => {
    const player = await loadPlayer(trx, userId);
    const base = fn(player);
    const { change, event } = kind ? rollRandomEvent(kind, player, base) : { change: base, event: null };
    if (change.user && Object.keys(change.user).length > 0) {
      await trx.updateTable('users').set(change.user).where('id', '=', userId).execute();
    }
    if (change.abilities && Object.keys(change.abilities).length > 0) {
      await trx.updateTable('abilities').set(change.abilities).where('user_id', '=', userId).execute();
    }
    for (const [itemId, quantity] of Object.entries(change.items ?? {})) {
      if (quantity <= 0) {
        await trx.deleteFrom('user_items').where('user_id', '=', userId).where('item_id', '=', itemId).execute();
      } else {
        await trx
          .insertInto('user_items')
          .values({ user_id: userId, item_id: itemId, quantity })
          .onConflict((oc) => oc.columns(['user_id', 'item_id']).doUpdateSet({ quantity }))
          .execute();
      }
    }
    for (const [jobId, exp] of Object.entries(change.jobExp ?? {})) {
      await trx
        .insertInto('user_job_exp')
        .values({ user_id: userId, job_id: jobId, exp })
        .onConflict((oc) => oc.columns(['user_id', 'job_id']).doUpdateSet({ exp }))
        .execute();
    }
    await addEvent(trx, userId, event ? `${change.message} ★${event.text}` : change.message);
    return event ? { message: change.message, event } : { message: change.message };
  });
}
