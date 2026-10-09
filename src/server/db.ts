import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, type Generated } from 'kysely';
import { ABILITIES, type AbilityKey } from '../shared/abilities';

export interface UsersTable {
  id: Generated<number>;
  name: string;
  password_hash: string;
  money: number;
  soup_kitchen_count: number;
  job_id: string;
  body_power: number;
  brain_power: number;
  condition: number;
  height: number;
  weight_g: number; // 体重（グラム）
  fullness: number;
  lover_id: number | null;
  spouse_id: number | null;
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
}

export type RelationshipType = 'date' | 'propose';
export type RelationshipStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface RelationshipRequestsTable {
  id: Generated<number>;
  from_id: number;
  to_id: number;
  type: RelationshipType;
  status: RelationshipStatus;
  created_at: string;
}

export interface DB {
  users: UsersTable;
  lands: LandsTable;
  relationship_requests: RelationshipRequestsTable;
  abilities: AbilitiesTable;
  events: EventsTable;
  user_items: UserItemsTable;
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
    .addColumn('soup_kitchen_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('job_id', 'text', (col) => col.notNull())
    .addColumn('body_power', 'integer', (col) => col.notNull())
    .addColumn('brain_power', 'integer', (col) => col.notNull())
    .addColumn('condition', 'integer', (col) => col.notNull())
    .addColumn('height', 'integer', (col) => col.notNull())
    .addColumn('weight_g', 'integer', (col) => col.notNull())
    .addColumn('fullness', 'integer', (col) => col.notNull())
    .addColumn('lover_id', 'integer', (col) => col.references('users.id'))
    .addColumn('spouse_id', 'integer', (col) => col.references('users.id'))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

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
    .execute();

  await db.schema
    .createTable('relationship_requests')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('from_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('to_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('events_user_id_idx')
    .ifNotExists()
    .on('events')
    .columns(['user_id', 'id'])
    .execute();
}
