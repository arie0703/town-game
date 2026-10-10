import { Hono } from 'hono';
import {
  buildingName,
  isBuildingType,
  isStoreKind,
  propertyValue,
  REALESTATE,
  sellPrice,
} from '../../shared/master/buildings';
import { yen } from '../../shared/format';
import { MAP_CELLS } from '../../shared/master/map';
import type { ActionResult } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { addEvent } from '../events';
import { GameError } from '../game/errors';

export const realestateRoutes = new Hono<AuthEnv>();

function lotOf(cellId: unknown) {
  const cell = MAP_CELLS[Number(cellId)];
  if (!cell || cell.type !== 'lot') throw new GameError('その場所は土地ではありません');
  return cell;
}

// 空き地を買い、建物を建てる（価格 = 土地の価格 + 建築費）
realestateRoutes.post('/realestate/buy', requireAuth, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const cell = lotOf(body?.cellId);
  const building = body?.building;
  if (!isBuildingType(building)) throw new GameError('建物の種類を選んでください');
  const storeKind = building === 'store' ? body?.storeKind : null;
  if (building === 'store' && !isStoreKind(storeKind)) throw new GameError('店舗の業種を選んでください');
  const price = propertyValue(cell.landPrice, building);

  const message = await db.transaction().execute(async (trx) => {
    const owned = await trx.selectFrom('lands').select('owner_id').where('cell_id', '=', cell.id).executeTakeFirst();
    if (owned) throw new GameError('その土地はすでに売れています');
    const count = await trx
      .selectFrom('lands')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('owner_id', '=', userId)
      .executeTakeFirstOrThrow();
    if (Number(count.count) >= REALESTATE.maxProperties) {
      throw new GameError(`物件は${REALESTATE.maxProperties}件までしか持てません`);
    }
    const user = await trx.selectFrom('users').select('money').where('id', '=', userId).executeTakeFirstOrThrow();
    if (user.money < price) throw new GameError('お金が足りません');

    await trx.updateTable('users').set({ money: user.money - price }).where('id', '=', userId).execute();
    await trx
      .insertInto('lands')
      .values({ cell_id: cell.id, owner_id: userId, purchased_price: price, building, store_kind: storeKind })
      .execute();
    const msg = `不動産屋で土地（${cell.x + 1}-${cell.y + 1}）を買い、${buildingName(building, storeKind)}を建てた（${yen(price)}）`;
    await addEvent(trx, userId, msg);
    return msg;
  });
  return c.json<ActionResult>({ message });
});

// 所有している物件を売る（評価額の 70%）。土地は空き地に戻る
realestateRoutes.post('/realestate/sell', requireAuth, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const cell = lotOf(body?.cellId);

  const message = await db.transaction().execute(async (trx) => {
    const land = await trx
      .selectFrom('lands')
      .select(['owner_id', 'building', 'store_kind'])
      .where('cell_id', '=', cell.id)
      .executeTakeFirst();
    if (!land || land.owner_id !== userId) throw new GameError('その物件は持っていません');
    const price = sellPrice(cell.landPrice, land.building);
    const user = await trx.selectFrom('users').select('money').where('id', '=', userId).executeTakeFirstOrThrow();

    await trx.deleteFrom('lands').where('cell_id', '=', cell.id).execute();
    await trx.updateTable('users').set({ money: user.money + price }).where('id', '=', userId).execute();
    const msg = `不動産屋で${buildingName(land.building, land.store_kind)}（${cell.x + 1}-${cell.y + 1}）を${yen(price)}で売った`;
    await addEvent(trx, userId, msg);
    return msg;
  });
  return c.json<ActionResult>({ message });
});
