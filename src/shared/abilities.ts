// 能力の定義（キー・表示名・カテゴリ）。client / server 共通
export const ABILITY_CATEGORIES = {
  brain: '頭脳',
  body: '身体',
  other: 'その他',
} as const;

export type AbilityCategory = keyof typeof ABILITY_CATEGORIES;

export const ABILITIES = [
  { key: 'japanese', label: '国語', category: 'brain' },
  { key: 'math', label: '数学', category: 'brain' },
  { key: 'science', label: '理科', category: 'brain' },
  { key: 'social', label: '社会', category: 'brain' },
  { key: 'language', label: '語学', category: 'brain' },
  { key: 'music', label: '音楽', category: 'brain' },
  { key: 'art', label: '美術', category: 'brain' },
  { key: 'looks', label: 'ルックス', category: 'body' },
  { key: 'stamina', label: '体力', category: 'body' },
  { key: 'health', label: '健康', category: 'body' },
  { key: 'speed', label: 'スピード', category: 'body' },
  { key: 'power', label: 'パワー', category: 'body' },
  { key: 'arm', label: '腕力', category: 'body' },
  { key: 'leg', label: '脚力', category: 'body' },
  { key: 'love', label: 'LOVE', category: 'other' },
  { key: 'humor', label: '面白さ', category: 'other' },
] as const satisfies ReadonlyArray<{ key: string; label: string; category: AbilityCategory }>;

export type AbilityKey = (typeof ABILITIES)[number]['key'];

export type Abilities = Record<AbilityKey, number>;
