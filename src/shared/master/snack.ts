import type { Abilities, AbilityKey } from '../abilities';
import type { ConsumableEffect } from './effects';
import type { StateId } from './states';

// スナック。ママとの友好度（0〜100）を育てる場所。数値は仮
export type MamaId = 'yoko' | 'kurenai';

// 友好度の段階（min 以上でその段階）。gainRate: その段階での友好度の伸び（段階が上がるほど鈍くなる）
export const AFFINITY_STAGES = [
  { min: 0, name: '初対面', gainRate: 1 },
  { min: 20, name: '顔なじみ', gainRate: 1 },
  { min: 40, name: '常連', gainRate: 0.5 },
  { min: 70, name: 'お気に入り', gainRate: 1 / 3 },
  { min: 100, name: '特別な客', gainRate: 1 / 3 },
] as const;

export const AFFINITY_MAX = 100;
export const REGULAR_STAGE = 2; // 常連（裏メニューが解放される）
export const FAVORITE_STAGE = 3; // お気に入り（プレゼントをもらえる）
export const SPECIAL_STAGE = 4; // 特別な客（称号）

export function affinityStage(value: number): number {
  let stage = 0;
  AFFINITY_STAGES.forEach((s, i) => {
    if (value >= s.min) stage = i;
  });
  return stage;
}

// 成功率の計算: base + 能力の平均 ÷ divisor（min〜max）
type Chance = { base: number; abilities: readonly AbilityKey[]; divisor: number; range: readonly [number, number] };

export function successRate(chance: Chance, abilities: Abilities, bonus = 0): number {
  const average = chance.abilities.reduce((sum, key) => sum + abilities[key], 0) / chance.abilities.length;
  const [min, max] = chance.range;
  return Math.min(max, Math.max(min, chance.base + average / chance.divisor + bonus));
}

export const SNACK_ACTIONS = {
  // ボトルキープ: お金で一気に友好度を上げる
  bottle: { name: 'ボトルキープ', fee: 100_000, affinity: 10 },
  // カラオケ: 感性で成否が決まる
  karaoke: {
    name: 'カラオケ',
    fee: 1_000,
    brainPower: 20,
    chance: { base: 0.3, abilities: ['music'], divisor: 200, range: [0.1, 0.95] },
    success: { affinity: 5, gain: { music: 1 } as Partial<Abilities> },
    failure: { affinity: -2, condition: -10 },
  },
  // ママと話す: 表現力・面白さで成否が決まる。成功すると、友好度に応じたヒントを話してくれる
  talk: {
    name: 'ママと話す',
    fee: 0,
    brainPower: 15,
    chance: { base: 0.4, abilities: ['japanese', 'humor'], divisor: 200, range: [0.2, 0.95] },
    success: { affinity: 3 },
  },
  // ママを煽てる: LOVE・ルックスで成否が決まる（ハイリスク）
  flatter: {
    name: 'ママを煽てる',
    fee: 0,
    brainPower: 10,
    chance: { base: 0.2, abilities: ['love', 'looks'], divisor: 250, range: [0.1, 0.9] },
    success: { affinity: 6 },
    failure: { affinity: -4 },
  },
} as const;

export type SnackActionId = keyof typeof SNACK_ACTIONS;

// 飲食メニュー（居酒屋よりかなり高い）。requiresStage があれば、その段階以上で注文できる裏メニュー
export type SnackMenu = {
  id: string;
  name: string;
  price: number;
  drink?: boolean;
  requiresStage?: number;
  effect: ConsumableEffect;
};

export type Mama = {
  id: MamaId;
  npcId: 'npc_yoko' | 'npc_kurenai';
  name: string;
  requiresState?: StateId; // この状態の住民にだけ出現する
  favoriteMenuId: string; // 好物（注文すると友好度 +3）
  bottleAffinity: number; // ボトルキープで上がる友好度
  karaokeBonus: number; // カラオケ成功時の友好度の上乗せ
  talkBonus: number; // 話す・煽てるの成功率の上乗せ（好みの客のとき）
  likes: (ctx: { abilities: Abilities; goodness: number }) => boolean; // 好みの客か
  gainRate: (ctx: { goodness: number }) => number; // 客の善悪による友好度の伸びの補正
  menus: readonly SnackMenu[];
  presentItemId: string; // お気に入りになったときのプレゼント
  hints: readonly (readonly string[])[]; // 「話す」に成功したときのヒント（段階ごと。上の段階ほど核心に迫る）
};

const COMMON_MENUS: readonly SnackMenu[] = [
  { id: 'mizuwari', name: '焼酎水割り', price: 3_000, drink: true, effect: { condition: -5, gain: { humor: 1 } } },
  { id: 'heartland', name: 'ハートランド', price: 3_500, drink: true, effect: { condition: -5, gain: { humor: 1, looks: 1 } } },
  { id: 'corona', name: 'コロナビール', price: 3_500, drink: true, effect: { condition: -5, gain: { language: 1, humor: 1 } } },
  { id: 'tantakatan', name: '鍛高譚', price: 4_000, drink: true, effect: { condition: -5, gain: { health: 1, music: 1 } } },
  { id: 'champagne', name: 'シャンパン', price: 5_000, drink: true, effect: { condition: -5, gain: { love: 2, looks: 1 } } },
  { id: 'laphroaig', name: 'ラフロイグ', price: 12_000, drink: true, effect: { condition: -10, gain: { science: 2, language: 1 } } },
  { id: 'yamazaki12', name: '山崎12年', price: 15_000, drink: true, effect: { condition: -5, gain: { art: 2, social: 2, love: 1 } } },
  { id: 'kawakimono', name: '乾き物の盛り合わせ', price: 2_000, effect: { condition: 10, gain: { health: 1 } } },
  { id: 'fruit_platter', name: 'フルーツ盛り', price: 2_500, effect: { condition: 15, gain: { looks: 1 } } },
];

export const MAMAS: readonly Mama[] = [
  {
    id: 'yoko',
    npcId: 'npc_yoko',
    name: '陽子ママ',
    favoriteMenuId: 'kawakimono',
    bottleAffinity: 10,
    karaokeBonus: 2,
    talkBonus: 0.1,
    // 面白い・話のうまい客が好き
    likes: ({ abilities }) => abilities.humor >= 50 || abilities.japanese >= 50,
    // 激ワルの客には説教してしまい、友好度が上がりにくい
    gainRate: ({ goodness }) => (goodness <= -60 ? 0.5 : 1),
    menus: [
      ...COMMON_MENUS,
      { id: 'yoko_nikujaga', name: '陽子ママの肉じゃが', price: 3_000, requiresStage: REGULAR_STAGE, effect: { condition: 80, gain: { health: 2 } } },
    ],
    presentItemId: 'yoko_omamori',
    hints: [
      ['この町、真面目に働くのが一番よ', '旅行もいいわよ。あたしは温泉が好き'],
      ['路地裏の露店？……あそこは悪い人しか相手にしないって噂よ', '遠い国ほど、珍しいお土産が見つかるらしいわよ'],
      ['善い行いをしてると、町の人が差し入れをくれたりするのよね', '中国の遺跡で、物騒なものを見つけた人がいるらしいわ'],
      ['あんたなら、何をやってもうまくいくわよ。あたしが保証する'],
      ['あんたはあたしの特別なお客さんよ。いつでもいらっしゃい'],
    ],
  },
  {
    id: 'kurenai',
    npcId: 'npc_kurenai',
    name: '紅ママ',
    requiresState: 'gang',
    favoriteMenuId: 'champagne',
    bottleAffinity: 15,
    karaokeBonus: 0,
    talkBonus: 0.15,
    // 腕っぷしの強い客が好き
    likes: ({ abilities }) => abilities.arm >= 60,
    // 悪いほど気に入られる
    gainRate: ({ goodness }) => (goodness <= -60 ? 1.5 : 1),
    menus: [
      ...COMMON_MENUS,
      { id: 'kurenai_sake', name: '紅ママの秘蔵酒', price: 10_000, drink: true, requiresStage: REGULAR_STAGE, effect: { condition: 30, gain: { arm: 2, power: 2 } } },
    ],
    presentItemId: 'kurenai_card',
    hints: [
      ['組で出世したいなら、まず金を積むことだね'],
      ['幹部になるには、中国で出回ってる銀色の代物が要るって話さ', '腕っぷしのない男は、組じゃ上に行けないよ'],
      ['組長になるなら、教養も要る。頭の悪い親分に誰もついてこないからね'],
      ['あんたのこと、上には良く言っておいてあげるよ'],
      ['あたしの口利きがあれば、上納金も少しは安くなるさ'],
    ],
  },
];

export function findMama(id: string): Mama | undefined {
  return MAMAS.find((m) => m.id === id);
}

// 紅ママの特別な客になると、裏組織の昇進の上納金が割引になる（口利き）
export const KURENAI_TRIBUTE_DISCOUNT = 0.2;
