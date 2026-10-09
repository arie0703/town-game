import type { Kysely } from 'kysely';
import type { DB } from './db';

// 出来事ログを記録する。トランザクション内でも使えるよう db / trx を受け取る
export async function addEvent(executor: Kysely<DB>, userId: number, message: string): Promise<void> {
  await executor
    .insertInto('events')
    .values({ user_id: userId, message, created_at: new Date().toISOString() })
    .execute();
}
