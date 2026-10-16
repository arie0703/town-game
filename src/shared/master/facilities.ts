// 施設マスタ
export const FACILITIES = [
  { id: 'shop', name: 'お店', description: 'アイテムを買えるお店。' },
  { id: 'job', name: '職業安定所', description: '職業の確認・転職ができる。' },
  { id: 'school', name: '学校', description: '勉強して頭脳の能力を上げる。' },
  { id: 'gym', name: 'トレーニングジム', description: 'トレーニングで身体の能力を上げる。' },
  { id: 'cafeteria', name: '食堂', description: 'その場で食事ができる。' },
  { id: 'casino', name: '賭場', description: '丁半で一攫千金を狙う。' },
  { id: 'realestate', name: '不動産屋', description: '土地を買って一軒家・マンション・店舗を建てられる。売却もできる。' },
  { id: 'bank', name: '銀行', description: 'お金を預けたり引き出したりできる。預けたお金はストリートファイトで負けても減らない。' },
  { id: 'blackmarket', name: '闇市場', description: '路地裏の怪しい露店。体を大きく変える薬や、高価な品を扱っている。' },
  { id: 'snack', name: 'スナック', description: 'ママとお酒を飲みながら語らう店。通うほど、ママとの仲が深まる。' },
  { id: 'izakaya', name: '居酒屋', description: 'お酒と料理を楽しめる。飲みすぎ注意。' },
  { id: 'travel', name: '旅行代理店', description: '国内外のツアーを扱う。お金と体力はかかるが、旅は人を成長させる。' },
  { id: 'hideout', name: '裏組織のアジト', description: '路地の奥にある古びた事務所。' },
  { id: 'townhall', name: '役場', description: '町の住民一覧（総資産ランキング）を見られる。寄付やボランティアで善行を積める。' },
] as const;

export type FacilityId = (typeof FACILITIES)[number]['id'];

export function findFacility(id: string) {
  return FACILITIES.find((f) => f.id === id);
}
