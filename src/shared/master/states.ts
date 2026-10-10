import type { FacilityId } from './facilities';

// 状態: 住民に付くラベル（複数付けられる）。blocks の行動ができなくなる
//   level: 状態ごとの段階（裏組織の階級など）。levelNames があればラベルに付ける
export type StateId = 'gang';

// 状態で制限できる行動
export type ActionId = 'bank' | 'donate' | 'volunteer';

export type StateDef = {
  label: string;
  tone: 'bad' | 'neutral' | 'goodness';
  blocks: readonly ActionId[];
  blockMessage: string; // 制限された行動をしようとしたときのメッセージ
  levelNames?: readonly string[];
  // この状態のときに施設の店主が言うセリフ（ランダムのセリフの代わりに固定で出す）
  npcLines?: Partial<Record<FacilityId, string>>;
};

export const STATES: Record<StateId, StateDef> = {
  gang: {
    label: '裏組織所属',
    tone: 'goodness',
    blocks: ['bank', 'donate', 'volunteer'],
    blockMessage: '裏組織の人間には縁のない場所だ',
    levelNames: ['組員', '幹部', '組長'],
    npcLines: { bank: '裏組織の方は口座を利用できません！', townhall: '裏組織の方からの寄付・ボランティアはお受けできません' },
  },
};

export type UserState = { id: StateId; level: number };

// 状態のどれかで制限されている行動か（画面でボタンを押せなくするのに使う）
export function isBlocked(states: readonly UserState[], action: ActionId): boolean {
  return states.some((s) => STATES[s.id].blocks.includes(action));
}

// 状態に応じた店主のセリフ（なければ undefined = ランダムのセリフ）
export function stateNpcLine(states: readonly UserState[], facility: FacilityId): string | undefined {
  return states.map((s) => STATES[s.id].npcLines?.[facility]).find((line) => line !== undefined);
}

export function isStateId(value: string): value is StateId {
  return Object.hasOwn(STATES, value);
}

export function stateLabel({ id, level }: UserState): string {
  const def = STATES[id];
  const levelName = def.levelNames?.[level];
  return levelName ? `${def.label}（${levelName}）` : def.label;
}
