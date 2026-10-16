import type { Kysely } from 'kysely';
import { TITLES, type TitleContext } from '../../shared/master/titles';
import type { ActionEvent } from '../../shared/types';
import type { DB } from '../db';
import { addEvent } from '../events';
import { landValue } from './assets';
import { loadPlayer } from './player';

// 累計カウンタを加算する（deltas: key → 増分）
export async function addStats(executor: Kysely<DB>, userId: number, deltas: Record<string, number>): Promise<void> {
  for (const [key, delta] of Object.entries(deltas)) {
    if (!delta) continue;
    await executor
      .insertInto('user_stats')
      .values({ user_id: userId, key, value: delta })
      .onConflict((oc) => oc.columns(['user_id', 'key']).doUpdateSet((eb) => ({ value: eb('user_stats.value', '+', delta) })))
      .execute();
  }
}

async function titleContext(executor: Kysely<DB>, userId: number): Promise<TitleContext> {
  const player = await loadPlayer(executor, userId);
  const statRows = await executor.selectFrom('user_stats').select(['key', 'value']).where('user_id', '=', userId).execute();
  const landTotal = player.lands.reduce((sum, l) => sum + landValue(l.cell_id, l.building), 0);
  return {
    soupKitchenCount: player.user.soup_kitchen_count,
    weightKg: player.user.weight_g / 1000,
    goodness: player.user.goodness,
    abilities: player.abilities,
    stats: Object.fromEntries(statRows.map((r) => [r.key, r.value])),
    properties: player.lands.length,
    totalAssets: player.user.money + player.user.deposit + landTotal,
    states: player.states,
  };
}

// 未獲得の称号の条件を判定し、満たしたものを付与する。獲得した称号の出来事を返す
//   log: true なら出来事ログにも記録する（runAction では行動のメッセージと一緒に記録するので false）
export async function awardTitles(executor: Kysely<DB>, userId: number, { log = false } = {}): Promise<ActionEvent[]> {
  const owned = new Set(
    (await executor.selectFrom('user_titles').select('title_id').where('user_id', '=', userId).execute()).map((r) => r.title_id),
  );
  const candidates = TITLES.filter((t) => !owned.has(t.id));
  if (candidates.length === 0) return [];
  const ctx = await titleContext(executor, userId);
  const events: ActionEvent[] = [];
  for (const title of candidates.filter((t) => t.check(ctx))) {
    await executor
      .insertInto('user_titles')
      .values({ user_id: userId, title_id: title.id, earned_at: new Date().toISOString() })
      .execute();
    const text = `称号『${title.name}』を獲得した！`;
    if (log) await addEvent(executor, userId, `★${text}`);
    events.push({ text, tone: 'good' });
  }
  return events;
}

// 起動時: 既存の住民について、今の状態で判定できる称号を付与する
export async function awardTitlesForAll(executor: Kysely<DB>): Promise<void> {
  const users = await executor.selectFrom('users').select('id').execute();
  for (const { id } of users) await awardTitles(executor, id, { log: true });
}
