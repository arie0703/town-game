import type { Kysely } from 'kysely';
import { propertyValue, type BuildingType } from '../../shared/master/buildings';
import { MAP_CELLS } from '../../shared/master/map';
import type { DB } from '../db';

// 物件の評価額 = マスタの土地価格 + 建物の建築費
export function landValue(cellId: number, building: BuildingType): number {
  const cell = MAP_CELLS[cellId];
  return cell?.type === 'lot' ? propertyValue(cell.landPrice, building) : 0;
}

// userId → 所有物件の評価額合計
export async function landValuesByOwner(executor: Kysely<DB>): Promise<Map<number, number>> {
  const lands = await executor.selectFrom('lands').select(['cell_id', 'owner_id', 'building']).execute();
  const result = new Map<number, number>();
  for (const land of lands) {
    result.set(land.owner_id, (result.get(land.owner_id) ?? 0) + landValue(land.cell_id, land.building));
  }
  return result;
}

export async function landValueOf(executor: Kysely<DB>, userId: number): Promise<number> {
  const lands = await executor.selectFrom('lands').select(['cell_id', 'building']).where('owner_id', '=', userId).execute();
  return lands.reduce((sum, land) => sum + landValue(land.cell_id, land.building), 0);
}
