import type { Abilities, AbilityKey } from '../abilities';
import { yen } from '../format';
import { isBad, isGood } from '../goodness';
import { JOB_LINES } from './jobs';
import { describeEffect } from './effects';

// ランダムイベントの対象になる行動の種類
export type ActionKind =
  | 'work'
  | 'rest'
  | 'gym'
  | 'school'
  | 'item'
  | 'cafeteria'
  | 'izakaya'
  | 'blackmarket'
  | 'fight'
  | 'shinogi';

// 行動の結果のうち、イベントの条件・効果に使う値（行動ごとに必要なものだけ入る）
export type EventContext = {
  pay?: number; // 仕事: 稼いだ額
  boughtItemId?: string; // 闇市場: 買ったアイテム
  boughtQuantity?: number;
  trainedAbilities?: AbilityKey[]; // 学校: その授業で上がった能力
};

// イベント抽選時の状態（行動の結果を反映した後）
export type EventState = {
  money: number;
  goodness: number;
  jobId: string;
  items: Record<string, number>;
};

// イベントの効果。必要なものだけ指定する
//   money: お金の増減、goodness: 善悪の増減、items: アイテムの個数の増減、jobExp: 今の職業の経験値の増減。ほかは ConsumableEffect と同じ
export type EventEffect = {
  money?: number;
  goodness?: number;
  fullness?: number;
  bodyPower?: number;
  brainPower?: number;
  condition?: number;
  weight?: number;
  gain?: Partial<Abilities>;
  jobExp?: number;
  items?: Record<string, number>;
};

export type RandomEvent = {
  id: string;
  text: string;
  actions: readonly ActionKind[] | 'all';
  jobs?: readonly string[]; // 指定すると、その職業に就いているときだけ起きる（職業特有のイベント）
  weight: number; // 抽選の重み（大きいほど起きやすい）
  tone: 'good' | 'bad';
  when?: (state: EventState, ctx: EventContext) => boolean;
  effect: EventEffect | ((state: EventState, ctx: EventContext) => EventEffect);
};

const payRate = (rate: number) => (_: EventState, ctx: EventContext): EventEffect => ({ money: Math.floor((ctx.pay ?? 0) * rate) });
const hasPay = (_: EventState, ctx: EventContext) => (ctx.pay ?? 0) > 0;

// 職業特有のイベントの重みの倍率。共通・仕事全般のイベントより起きやすくする
const JOB_EVENT_WEIGHT_RATE = 4;

// 職業特有のイベント（仕事をしたときのみ）
function jobEvents(): RandomEvent[] {
  const work = ['work'] as const;
  const list: Array<Omit<RandomEvent, 'actions'>> = [
    // アルバイト系統
    { id: 'regular_customer', text: '常連さんに名前を覚えられた', jobs: JOB_LINES.parttime, weight: 12, tone: 'good', effect: (s, c) => ({ ...payRate(0.3)(s, c), gain: { humor: 1 } }) },
    { id: 'register_short', text: 'レジのお金が合わず自腹を切った', jobs: JOB_LINES.parttime, weight: 10, tone: 'bad', effect: { money: -1_000 } },
    { id: 'mass_resignation', text: 'バイトが一斉に辞めた', jobs: ['store_manager'], weight: 8, tone: 'bad', effect: { bodyPower: -30, condition: -20 } },

    // 教師系統
    { id: 'thank_you_letter', text: '教え子から感謝の手紙が届いた', jobs: JOB_LINES.teacher, weight: 12, tone: 'good', effect: { condition: 20, gain: { japanese: 1 } } },
    { id: 'parent_complaint', text: '保護者からクレームが来た', jobs: JOB_LINES.teacher, weight: 10, tone: 'bad', effect: { condition: -20 } },
    { id: 'school_award', text: '学校が表彰された', jobs: ['principal'], weight: 6, tone: 'good', effect: { money: 10_000 } },

    // プログラマー系統
    { id: 'tool_went_viral', text: '書いたツールがバズった', jobs: JOB_LINES.programmer, weight: 10, tone: 'good', effect: payRate(1) },
    { id: 'production_down', text: '本番環境を落として給料がパーになった', jobs: JOB_LINES.programmer, weight: 8, tone: 'bad', when: hasPay, effect: (s, c) => ({ ...payRate(-1)(s, c), condition: -20 }) },
    { id: 'all_night_debug', text: '徹夜でデバッグした', jobs: JOB_LINES.programmer, weight: 10, tone: 'bad', effect: { brainPower: -30, fullness: -20 } },

    // フィットネストレーナー系統
    { id: 'client_success', text: 'お客さんが劇的に痩せて口コミが広がった', jobs: JOB_LINES.trainer, weight: 12, tone: 'good', effect: (s, c) => ({ ...payRate(0.5)(s, c), jobExp: 1 }) },
    { id: 'back_strain', text: 'お手本を見せていて腰を痛めた', jobs: JOB_LINES.trainer, weight: 10, tone: 'bad', effect: { bodyPower: -30, condition: -15 } },

    // モデル系統
    { id: 'magazine_cover', text: '雑誌の表紙に抜擢された', jobs: JOB_LINES.model, weight: 10, tone: 'good', effect: (s, c) => ({ ...payRate(1)(s, c), gain: { looks: 1 } }) },
    { id: 'puffy_face', text: '撮影前にむくんでいて給料が半分になった', jobs: JOB_LINES.model, weight: 10, tone: 'bad', when: hasPay, effect: payRate(-0.5) },
    { id: 'gossip', text: 'ゴシップ記事が出た', jobs: JOB_LINES.model, weight: 8, tone: 'bad', effect: { condition: -20, gain: { love: -2 } } },

    // 芸人系統
    { id: 'big_laugh', text: 'ネタが大ウケした', jobs: JOB_LINES.comedian, weight: 12, tone: 'good', effect: (s, c) => ({ ...payRate(1)(s, c), gain: { humor: 2 } }) },
    { id: 'bombed', text: '盛大にスベって給料がパーになった', jobs: JOB_LINES.comedian, weight: 12, tone: 'bad', when: hasPay, effect: (s, c) => ({ ...payRate(-1)(s, c), condition: -15 }) },
    { id: 'one_hit_tv', text: '一発屋としてテレビに出演した', jobs: ['comedian'], weight: 6, tone: 'good', effect: { money: 5_000 } },

    // 相撲系統
    { id: 'kinboshi', text: '金星を挙げて懸賞金を得た', jobs: JOB_LINES.sumo, weight: 10, tone: 'good', effect: { money: 5_000, gain: { power: 1 } } },
    { id: 'sprained_ankle', text: '土俵際で足をくじいた', jobs: JOB_LINES.sumo, weight: 10, tone: 'bad', effect: { bodyPower: -40, condition: -20 } },
    { id: 'too_much_chanko', text: 'ちゃんこを食べすぎた', jobs: JOB_LINES.sumo, weight: 12, tone: 'good', effect: { fullness: 30, weight: 1 } },

    // 総合格闘技系統
    { id: 'ko_win', text: 'KO勝ちしてファイトマネーを得た', jobs: JOB_LINES.mma, weight: 10, tone: 'good', effect: payRate(1) },
    { id: 'missed_weight', text: '計量に失敗して罰金を払った', jobs: JOB_LINES.mma, weight: 8, tone: 'bad', effect: { money: -3_000, weight: -1 } },
    { id: 'took_a_punch', text: '顔面に一発もらった', jobs: JOB_LINES.mma, weight: 10, tone: 'bad', effect: { condition: -25, gain: { looks: -1 } } },

    // カレー系統
    { id: 'gourmet_review', text: 'グルメサイトで高評価がついた', jobs: JOB_LINES.curry, weight: 12, tone: 'good', effect: (s, c) => ({ ...payRate(0.5)(s, c), jobExp: 1 }) },
    { id: 'staff_curry', text: 'まかないのカレーがうまくできた', jobs: JOB_LINES.curry, weight: 12, tone: 'good', effect: { fullness: 30, weight: 0.3 } },
    { id: 'wrong_spice', text: 'スパイスの配合を間違えて給料が半分になった', jobs: JOB_LINES.curry, weight: 10, tone: 'bad', when: hasPay, effect: (s, c) => ({ ...payRate(-0.5)(s, c), gain: { science: -1 } }) },

    // バーテンダー系統
    { id: 'love_advice', text: '常連客の恋愛相談に乗ってチップをもらった', jobs: JOB_LINES.bar, weight: 12, tone: 'good', effect: { money: 2_000, gain: { love: 2 } } },
    { id: 'broke_bottle', text: '高級ボトルを割って弁償した', jobs: JOB_LINES.bar, weight: 8, tone: 'bad', when: (s) => s.money >= 5_000, effect: { money: -5_000 } },
    { id: 'drank_with_guest', text: '客に付き合って飲みすぎた', jobs: JOB_LINES.bar, weight: 10, tone: 'bad', effect: { condition: -20 } },
  ];
  return list.map((e) => ({ ...e, actions: work, weight: e.weight * JOB_EVENT_WEIGHT_RATE }));
}

export const RANDOM_EVENTS: readonly RandomEvent[] = [
  // 共通
  { id: 'coin', text: '道で100円を拾った', actions: 'all', weight: 30, tone: 'good', effect: { money: 100 } },
  {
    id: 'wallet',
    text: '財布を落とした',
    actions: 'all',
    weight: 15,
    tone: 'bad',
    when: (s) => s.money >= 1_000,
    effect: (s) => ({ money: -Math.floor(s.money * 0.2) }),
  },
  {
    id: 'snatch',
    text: 'ひったくりに遭った',
    actions: 'all',
    weight: 5,
    tone: 'bad',
    when: (s) => s.money >= 10_000,
    effect: (s) => ({ money: -Math.floor(s.money * 0.5) }),
  },
  { id: 'cat', text: '野良猫になつかれた', actions: 'all', weight: 20, tone: 'good', effect: { condition: 10 } },
  { id: 'cold', text: '風邪をひいた', actions: 'all', weight: 10, tone: 'bad', effect: { condition: -20, bodyPower: -20 } },
  { id: 'lottery', text: '宝くじが当たった', actions: 'all', weight: 1, tone: 'good', effect: { money: 30_000 } },

  // 善悪（共通）
  { id: 'lost_child', text: '迷子を交番に届けた', actions: 'all', weight: 10, tone: 'good', effect: { goodness: 5 } },
  { id: 'caught_peeing', text: '立ちションして注意された', actions: 'all', weight: 10, tone: 'bad', effect: { goodness: -5 } },
  // 善（ヨイ以上）のみ
  { id: 'commended', text: '善行が表彰された', actions: 'all', weight: 10, tone: 'good', when: (s) => isGood(s.goodness), effect: { money: 5_000 } },
  { id: 'neighbor_gift', text: '近所の人から差し入れをもらった', actions: 'all', weight: 15, tone: 'good', when: (s) => isGood(s.goodness), effect: { fullness: 20 } },
  // 悪（ワル以下）のみ
  {
    id: 'police_question',
    text: '警察に職務質問され罰金を払った',
    actions: 'all',
    weight: 15,
    tone: 'bad',
    when: (s) => isBad(s.goodness) && s.money >= 3_000,
    effect: { money: -3_000 },
  },
  { id: 'thug', text: 'チンピラに絡まれた', actions: 'all', weight: 10, tone: 'bad', when: (s) => isBad(s.goodness), effect: { condition: -15 } },

  // 仕事
  {
    id: 'big_mistake',
    text: '大きなミスをして給料がパーになった',
    actions: ['work'],
    weight: 10,
    tone: 'bad',
    when: (_, ctx) => (ctx.pay ?? 0) > 0,
    effect: (_, ctx) => ({ money: -(ctx.pay ?? 0), condition: -10 }),
  },
  { id: 'headhunted', text: 'ヘッドハンティングされた', actions: ['work'], weight: 3, tone: 'good', effect: { jobExp: 3 } },

  ...jobEvents(),

  // 休息
  { id: 'deep_sleep', text: 'ぐっすり眠れた', actions: ['rest'], weight: 20, tone: 'good', effect: { condition: 20 } },
  { id: 'nightmare', text: '悪夢を見た', actions: ['rest'], weight: 15, tone: 'bad', effect: { condition: -10 } },

  // ジム
  { id: 'scouted', text: 'スカウトされた', actions: ['gym'], weight: 15, tone: 'good', effect: { gain: { looks: 2 } } },
  {
    id: 'muscle_strain',
    text: '筋肉を痛めた',
    actions: ['gym'],
    weight: 15,
    tone: 'bad',
    effect: { bodyPower: -30, condition: -15 },
  },

  // 学校
  {
    id: 'praised_by_teacher',
    text: '先生に褒められた',
    actions: ['school'],
    weight: 20,
    tone: 'good',
    effect: (_, ctx) => ({
      brainPower: 10,
      gain: Object.fromEntries((ctx.trainedAbilities ?? []).map((key) => [key, 1])),
    }),
  },
  { id: 'dozed_off', text: '居眠りして怒られた', actions: ['school'], weight: 15, tone: 'bad', effect: { condition: -10 } },

  // 食堂
  {
    id: 'large_serving',
    text: '大盛りサービスしてもらった',
    actions: ['cafeteria'],
    weight: 20,
    tone: 'good',
    effect: { fullness: 20, weight: 0.3 },
  },
  {
    id: 'stomachache',
    text: '食べすぎてお腹を壊した',
    actions: ['cafeteria'],
    weight: 15,
    tone: 'bad',
    effect: { condition: -15, fullness: -20 },
  },

  // 居酒屋
  { id: 'kindred_spirit', text: '隣の席の人と意気投合した', actions: ['izakaya'], weight: 20, tone: 'good', effect: { gain: { love: 2 } } },
  {
    id: 'drunk_fall',
    text: '酔っぱらって転んだ',
    actions: ['izakaya'],
    weight: 15,
    tone: 'bad',
    effect: { condition: -5, gain: { humor: 1 } },
  },
  {
    id: 'treat_others',
    text: 'まわりの客におごらされた',
    actions: ['izakaya'],
    weight: 10,
    tone: 'bad',
    when: (s) => s.money >= 2_000,
    effect: { money: -2_000 },
  },

  // 闇市場（購入時）
  {
    id: 'fake_goods',
    text: '偽物をつかまされ、買った品が消えた',
    actions: ['blackmarket'],
    weight: 10,
    tone: 'bad',
    when: (_, ctx) => ctx.boughtItemId !== undefined,
    effect: (_, ctx) => ({ items: { [ctx.boughtItemId!]: -(ctx.boughtQuantity ?? 0) } }),
  },
  {
    id: 'bonus_goods',
    text: 'おまけで同じ品をもう1個もらった',
    actions: ['blackmarket'],
    weight: 15,
    tone: 'good',
    when: (_, ctx) => ctx.boughtItemId !== undefined,
    effect: (_, ctx) => ({ items: { [ctx.boughtItemId!]: 1 } }),
  },

  // ストリートファイト
  { id: 'master', text: '通りすがりの師匠に技を教わった', actions: ['fight'], weight: 15, tone: 'good', effect: { gain: { arm: 2 } } },
  {
    id: 'police',
    text: '警察に止められて罰金を払った',
    actions: ['fight'],
    weight: 10,
    tone: 'bad',
    when: (s) => s.money >= 5_000,
    effect: { money: -5_000 },
  },
];

// 効果の説明（「+100円 / コンディション +10」のような1行）。実際に反映された量で作る
export function describeEventEffect(effect: EventEffect): string {
  const parts = [
    effect.money ? `${effect.money > 0 ? '+' : '-'}${yen(Math.abs(effect.money))}` : '',
    describeEffect({ ...effect, gain: effect.gain ?? {} }),
    effect.jobExp ? `経験値 +${effect.jobExp}` : '',
  ];
  return parts.filter(Boolean).join(' / ');
}
