import type { Kysely, Selectable, Updateable } from 'kysely';
import { ABILITIES, type Abilities } from '../../shared/abilities';
import { LIMITS } from '../../shared/config';
import type { ActionKind, EventContext } from '../../shared/master/random-events';
import { isStateId, STATES, type ActionId, type StateId, type UserState } from '../../shared/master/states';
import type { ActionEvent, ActionResult } from '../../shared/types';
import { db, type DB, type LandsTable, type UsersTable } from '../db';
import { addEvent } from '../events';
import { GameError } from './errors';
import { rollPropertyIncome } from './property-income';
import { rollRandomEvent } from './random-events';

// items: 所持アイテム（itemId → 個数）、jobExp: 職業ごとの経験値（jobId → 経験値）、lands: 所有している物件
export type Player = {
  user: Selectable<UsersTable>;
  abilities: Abilities;
  items: Record<string, number>;
  jobExp: Record<string, number>;
  lands: Array<Pick<Selectable<LandsTable>, 'cell_id' | 'building' | 'store_kind'>>;
  states: UserState[];
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
  // 状態の付け外し（set: 付ける・段階を変える、remove: 外す）
  states?: { set?: UserState[]; remove?: StateId[] };
};

// 状態で制限されている行動なら断る
export function assertAllowed(player: Player, action: ActionId): void {
  const blocking = player.states.find((s) => STATES[s.id].blocks.includes(action));
  if (blocking) throw new GameError(STATES[blocking.id].blockMessage);
}

export function stateOf(player: Player, id: StateId): UserState | undefined {
  return player.states.find((s) => s.id === id);
}

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
  const lands = await executor
    .selectFrom('lands')
    .select(['cell_id', 'building', 'store_kind'])
    .where('owner_id', '=', userId)
    .orderBy('cell_id')
    .execute();
  const stateRows = await executor
    .selectFrom('user_states')
    .select(['state_id', 'level'])
    .where('user_id', '=', userId)
    .execute();
  // マスタから消した状態は無視する
  const states = stateRows.filter((r) => isStateId(r.state_id)).map((r) => ({ id: r.state_id, level: r.level }));
  return { user, abilities, items, jobExp, lands, states };
}

// アクション共通処理: 読み込み → 計算（fn）→ ランダムイベント・物件の収入 → 書き戻し → 出来事ログ を1トランザクションで行う
//   kind: ランダムイベント・物件の収入の対象の行動の種類（省略すると起きない）
export async function runAction(
  userId: number,
  fn: (player: Player) => PlayerChange,
  kind?: ActionKind,
): Promise<ActionResult> {
  return db.transaction().execute(async (trx) => {
    const player = await loadPlayer(trx, userId);
    let change = fn(player);
    const events: ActionEvent[] = [];
    if (kind) {
      const random = rollRandomEvent(kind, player, change);
      const income = rollPropertyIncome(player, random.change);
      change = income.change;
      events.push(...random.events, ...income.events);
    }
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
    for (const id of change.states?.remove ?? []) {
      await trx.deleteFrom('user_states').where('user_id', '=', userId).where('state_id', '=', id).execute();
    }
    for (const { id, level } of change.states?.set ?? []) {
      await trx
        .insertInto('user_states')
        .values({ user_id: userId, state_id: id, level, created_at: new Date().toISOString() })
        .onConflict((oc) => oc.columns(['user_id', 'state_id']).doUpdateSet({ level }))
        .execute();
    }
    await addEvent(trx, userId, [change.message, ...events.map((e) => `★${e.text}`)].join(' '));
    return events.length > 0 ? { message: change.message, events } : { message: change.message };
  });
}
