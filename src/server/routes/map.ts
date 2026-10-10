import { Hono } from 'hono';
import { MAP_CELLS } from '../../shared/master/map';
import type { MapCellView, UserRef } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';

export const mapRoutes = new Hono<AuthEnv>();

mapRoutes.get('/map', requireAuth, async (c) => {
  const lands = await db
    .selectFrom('lands')
    .innerJoin('users', 'users.id', 'lands.owner_id')
    .select(['lands.cell_id', 'lands.building', 'lands.store_kind', 'users.id', 'users.name'])
    .execute();
  const byCell = new Map(lands.map((l) => [l.cell_id, l]));
  const cells: MapCellView[] = MAP_CELLS.map((cell) => {
    if (cell.type !== 'lot') return cell;
    const land = byCell.get(cell.id);
    const owner: UserRef | null = land ? { id: land.id, name: land.name } : null;
    return { ...cell, owner, building: land?.building ?? null, storeKind: land?.store_kind ?? null };
  });
  return c.json(cells);
});
