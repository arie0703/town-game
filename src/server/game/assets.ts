import type { Kysely } from 'kysely';
import { MAP_CELLS } from '../../shared/master/map';
import type { DB } from '../db';

// 土地の評価額 = マスタの土地価格
export function landValue(cellId: number): number {
  const cell = MAP_CELLS[cellId];
  return cell?.type === 'lot' ? cell.landPrice : 0;
}

// userId → 所有土地の評価額合計
export async function landValuesByOwner(executor: Kysely<DB>): Promise<Map<number, number>> {
  const lands = await executor.selectFrom('lands').select(['cell_id', 'owner_id']).execute();
  const result = new Map<number, number>();
  for (const land of lands) {
    result.set(land.owner_id, (result.get(land.owner_id) ?? 0) + landValue(land.cell_id));
  }
  return result;
}

export async function landValueOf(executor: Kysely<DB>, userId: number): Promise<number> {
  const lands = await executor.selectFrom('lands').select('cell_id').where('owner_id', '=', userId).execute();
  return lands.reduce((sum, land) => sum + landValue(land.cell_id), 0);
}
