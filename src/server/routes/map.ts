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
    .select(['lands.cell_id', 'users.id', 'users.name'])
    .execute();
  const owners = new Map<number, UserRef>(lands.map((l) => [l.cell_id, { id: l.id, name: l.name }]));
  const cells: MapCellView[] = MAP_CELLS.map((cell) =>
    cell.type === 'lot' ? { ...cell, owner: owners.get(cell.id) ?? null } : cell,
  );
  return c.json(cells);
});
