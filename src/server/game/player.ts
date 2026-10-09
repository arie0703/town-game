import type { Kysely, Selectable, Updateable } from 'kysely';
import { ABILITIES, type Abilities } from '../../shared/abilities';
import { LIMITS } from '../../shared/config';
import { db, type DB, type UsersTable } from '../db';
import { addEvent } from '../events';
import { GameError } from './errors';

// items: 所持アイテム（itemId → 個数）
export type Player = { user: Selectable<UsersTable>; abilities: Abilities; items: Record<string, number> };

export type PlayerChange = {
  user?: Updateable<UsersTable>;
  abilities?: Partial<Abilities>;
  // 変更後のアイテム個数（itemId → 個数。0 なら削除）
  items?: Record<string, number>;
  message: string;
};

// 能力値を加算する（上限が設定されていれば頭打ち）
export function addAbilities(base: Abilities, gain: Partial<Abilities>): Partial<Abilities> {
  const result: Partial<Abilities> = {};
  for (const [key, value] of Object.entries(gain) as Array<[keyof Abilities, number]>) {
    const next = base[key] + value;
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
  return { user, abilities, items };
}

// アクション共通処理: 読み込み → 計算（fn）→ 書き戻し → 出来事ログ を1トランザクションで行う
export async function runAction(userId: number, fn: (player: Player) => PlayerChange): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const player = await loadPlayer(trx, userId);
    const change = fn(player);
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
    await addEvent(trx, userId, change.message);
    return change.message;
  });
}
