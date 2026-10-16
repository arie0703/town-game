import Database from 'better-sqlite3';
import { Kysely, sql, SqliteDialect, type Generated } from 'kysely';
import { ABILITIES, type AbilityKey } from '../shared/abilities';
import type { BuildingType, StoreKind } from '../shared/master/buildings';
import { MAP_CELLS } from '../shared/master/map';
import type { StateId } from '../shared/master/states';
import { JOBS } from '../shared/master/jobs';

export interface UsersTable {
  id: Generated<number>;
  name: string;
  password_hash: string;
  money: number;
  deposit: number; // 銀行の預金
  goodness: number; // 善悪（-100〜100）
  soup_kitchen_count: number;
  job_id: string;
  body_power: number;
  brain_power: number;
  condition: number; // 体力（コンディションと満腹度を統合したもの）
  height: number;
  weight_g: number; // 体重（グラム）
  fullness: number; // 使わなくなった列（体力に統合済み。-1 = 移行済み）
  created_at: string;
}

export type AbilitiesTable = { user_id: number } & Record<AbilityKey, number>;

export interface EventsTable {
  id: Generated<number>;
  user_id: number;
  message: string;
  created_at: string;
}

export interface UserItemsTable {
  user_id: number;
  item_id: string;
  quantity: number;
}

export interface LandsTable {
  cell_id: number;
  owner_id: number;
  purchased_price: number;
  building: BuildingType; // 建物の種類
  store_kind: StoreKind | null; // 店舗の業種（店舗以外は null）
}

export interface UserJobExpTable {
  user_id: number;
  job_id: string;
  exp: number;
}

// 獲得済みの称号
export interface UserTitlesTable {
  user_id: number;
  title_id: string;
  earned_at: string;
}

// 称号の判定に使う累計カウンタ（key は STAT_KEYS を参照）
export interface UserStatsTable {
  user_id: number;
  key: string;
  value: number;
}

// 住民に付いている状態（level: 裏組織の階級などの段階）
export interface UserStatesTable {
  user_id: number;
  state_id: StateId;
  level: number;
  created_at: string;
}

export interface DB {
  users: UsersTable;
  lands: LandsTable;
  abilities: AbilitiesTable;
  events: EventsTable;
  user_items: UserItemsTable;
  user_job_exp: UserJobExpTable;
  user_states: UserStatesTable;
  user_titles: UserTitlesTable;
  user_stats: UserStatsTable;
}

const dbPath = process.env.DB_PATH ?? 'town.sqlite';

export const db = new Kysely<DB>({
  dialect: new SqliteDialect({ database: new Database(dbPath) }),
});

// 起動時にテーブルを作成する（マイグレーションの仕組みは持たない）
export async function initDb(): Promise<void> {
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull().unique())
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .addColumn('money', 'integer', (col) => col.notNull())
    .addColumn('deposit', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('goodness', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('soup_kitchen_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('job_id', 'text', (col) => col.notNull())
    .addColumn('body_power', 'integer', (col) => col.notNull())
    .addColumn('brain_power', 'integer', (col) => col.notNull())
    .addColumn('condition', 'integer', (col) => col.notNull())
    .addColumn('height', 'integer', (col) => col.notNull())
    .addColumn('weight_g', 'integer', (col) => col.notNull())
    .addColumn('fullness', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  // 後から追加した列: 既存の DB に無ければ追加する
  const usersTable = (await db.introspection.getTables()).find((t) => t.name === 'users');
  if (usersTable && !usersTable.columns.some((col) => col.name === 'deposit')) {
    await db.schema
      .alterTable('users')
      .addColumn('deposit', 'integer', (col) => col.notNull().defaultTo(0))
      .execute();
  }
  if (usersTable && !usersTable.columns.some((col) => col.name === 'goodness')) {
    await db.schema
      .alterTable('users')
      .addColumn('goodness', 'integer', (col) => col.notNull().defaultTo(0))
      .execute();
  }

  let abilities = db.schema
    .createTable('abilities')
    .ifNotExists()
    .addColumn('user_id', 'integer', (col) => col.primaryKey().references('users.id'));
  for (const { key } of ABILITIES) {
    abilities = abilities.addColumn(key, 'integer', (col) => col.notNull());
  }
  await abilities.execute();

  await db.schema
    .createTable('events')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('message', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('user_items')
    .ifNotExists()
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('item_id', 'text', (col) => col.notNull())
    .addColumn('quantity', 'integer', (col) => col.notNull())
    .addPrimaryKeyConstraint('user_items_pk', ['user_id', 'item_id'])
    .execute();

  await db.schema
    .createTable('lands')
    .ifNotExists()
    .addColumn('cell_id', 'integer', (col) => col.primaryKey())
    .addColumn('owner_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('purchased_price', 'integer', (col) => col.notNull())
    .addColumn('building', 'text', (col) => col.notNull().defaultTo('house'))
    .addColumn('store_kind', 'text')
    .execute();

  // 後から追加した列: 既存の土地は一軒家として扱う
  const landsTable = (await db.introspection.getTables()).find((t) => t.name === 'lands');
  if (landsTable && !landsTable.columns.some((col) => col.name === 'building')) {
    await db.schema.alterTable('lands').addColumn('building', 'text', (col) => col.notNull().defaultTo('house')).execute();
    await db.schema.alterTable('lands').addColumn('store_kind', 'text').execute();
  }

  await db.schema
    .createTable('user_job_exp')
    .ifNotExists()
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('job_id', 'text', (col) => col.notNull())
    .addColumn('exp', 'integer', (col) => col.notNull())
    .addPrimaryKeyConstraint('user_job_exp_pk', ['user_id', 'job_id'])
    .execute();

  await db.schema
    .createTable('user_states')
    .ifNotExists()
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('state_id', 'text', (col) => col.notNull())
    .addColumn('level', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('user_states_pk', ['user_id', 'state_id'])
    .execute();

  await db.schema
    .createTable('user_titles')
    .ifNotExists()
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('title_id', 'text', (col) => col.notNull())
    .addColumn('earned_at', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('user_titles_pk', ['user_id', 'title_id'])
    .execute();

  await db.schema
    .createTable('user_stats')
    .ifNotExists()
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('key', 'text', (col) => col.notNull())
    .addColumn('value', 'integer', (col) => col.notNull())
    .addPrimaryKeyConstraint('user_stats_pk', ['user_id', 'key'])
    .execute();

  await db.schema
    .createIndex('events_user_id_idx')
    .ifNotExists()
    .on('events')
    .columns(['user_id', 'id'])
    .execute();

  // 職業 ID の変更: スポーツ選手（athlete）→ フィットネストレーナー（fitness_trainer）
  await db.updateTable('users').set({ job_id: 'fitness_trainer' }).where('job_id', '=', 'athlete').execute();
  await db.updateTable('user_job_exp').set({ job_id: 'fitness_trainer' }).where('job_id', '=', 'athlete').execute();

  // 削除した職業（会社員系統など）に就いている住民は無職に戻す
  await db
    .updateTable('users')
    .set({ job_id: 'none' })
    .where('job_id', 'not in', JOBS.map((j) => j.id))
    .execute();

  // コンディションと満腹度を体力に統合: 体力 = (コンディション + 満腹度) ÷ 2。移行済みの住民は fullness = -1
  await sql`UPDATE users SET condition = MIN(100, (condition + fullness) / 2), fullness = -1 WHERE fullness >= 0`.execute(db);

  // マップの変更で空き地でなくなった場所の土地は、購入額を返金して手放させる
  const lotIds = MAP_CELLS.filter((c) => c.type === 'lot').map((c) => c.id);
  const lost = await db.selectFrom('lands').selectAll().where('cell_id', 'not in', lotIds).execute();
  for (const land of lost) {
    await db
      .updateTable('users')
      .set((eb) => ({ money: eb('money', '+', land.purchased_price) }))
      .where('id', '=', land.owner_id)
      .execute();
    await db.deleteFrom('lands').where('cell_id', '=', land.cell_id).execute();
  }
}
