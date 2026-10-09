// 施設マスタ
export const FACILITIES = [
  { id: 'shop', name: 'お店', description: 'アイテムを買えるお店。' },
  { id: 'job', name: '職業安定所', description: '職業の確認・転職ができる。' },
  { id: 'school', name: '学校', description: '勉強して頭脳の能力を上げる。' },
  { id: 'gym', name: 'トレーニングジム', description: 'トレーニングで身体の能力を上げる。' },
  { id: 'cafeteria', name: '食堂', description: 'その場で食事ができる。' },
  { id: 'casino', name: '賭場', description: '丁半で一攫千金を狙う。' },
  { id: 'realestate', name: '不動産屋', description: '空き地を購入できる。' },
  { id: 'townhall', name: '役場', description: '町の住民一覧（総資産ランキング）を見られる。' },
] as const;

export type FacilityId = (typeof FACILITIES)[number]['id'];

export function findFacility(id: string) {
  return FACILITIES.find((f) => f.id === id);
}
