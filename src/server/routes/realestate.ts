import { Hono } from 'hono';
import { yen } from '../../shared/format';
import { MAP_CELLS } from '../../shared/master/map';
import type { ActionResult } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { addEvent } from '../events';
import { GameError } from '../game/errors';

export const realestateRoutes = new Hono<AuthEnv>();

// 空き地を購入する（売却はできない）
realestateRoutes.post('/realestate/buy', requireAuth, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const cell = MAP_CELLS[Number(body?.cellId)];
  if (!cell || cell.type !== 'lot') throw new GameError('その場所は購入できません');

  const message = await db.transaction().execute(async (trx) => {
    const owned = await trx.selectFrom('lands').select('owner_id').where('cell_id', '=', cell.id).executeTakeFirst();
    if (owned) throw new GameError('その土地はすでに売れています');
    const user = await trx.selectFrom('users').select('money').where('id', '=', userId).executeTakeFirstOrThrow();
    if (user.money < cell.landPrice) throw new GameError('お金が足りません');

    await trx.updateTable('users').set({ money: user.money - cell.landPrice }).where('id', '=', userId).execute();
    await trx.insertInto('lands').values({ cell_id: cell.id, owner_id: userId, purchased_price: cell.landPrice }).execute();
    const msg = `不動産屋で土地（${cell.x + 1}-${cell.y + 1}）を${yen(cell.landPrice)}で購入した`;
    await addEvent(trx, userId, msg);
    return msg;
  });
  return c.json<ActionResult>({ message });
});
