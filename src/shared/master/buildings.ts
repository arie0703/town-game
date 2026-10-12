import type { AbilityKey } from '../abilities';
import { JOB_LINES } from './jobs';

// 土地に建てる建物。評価額 = 土地の価格 + 建築費。売却額は評価額 × sellRate
export type BuildingType = 'house' | 'mansion' | 'store';
export type StoreKind = 'convenience' | 'restaurant' | 'bar';

export const REALESTATE = {
  maxProperties: 3, // 所有できる物件の上限
  sellRate: 0.7,
  // 一軒家を持っていると、休息の回復量がこの倍率になる（何件持っても同じ）
  houseRestRate: 1.5,
  // 能力による補正 = 1 + (対象の能力の平均 - abilityBase) / abilityDivisor（0.5〜3 倍）
  abilityBase: 20,
  abilityDivisor: 100,
  abilityRateRange: [0.5, 3],
  // 店舗の業種と同じ系統の職業に就いていると、売上がこの倍率になる
  jobLineRate: 1.5,
  // 強盗を撃退する確率 = 身体パワー ÷ robberyRepelDivisor（5〜90%）。撃退すると身体パワーを消費する
  robberyRepelDivisor: 300,
  robberyRepelRange: [0.05, 0.9],
  robberyPowerCost: 20,
} as const;

// 収入イベントの結果
//   income: 通常の収入に掛ける倍率（0 = 収入なし）、money: 固定額の増減、condition: 体力の増減
//   robbery: 強盗（身体パワーで撃退判定。撃退なら収入 × 2 の賞金、失敗なら収入 × 2 を失う）
export type IncomeOutcome = {
  id: string;
  text: string;
  tone: 'good' | 'bad';
  weight: number;
  income?: number;
  money?: number;
  condition?: number;
  robbery?: true;
};

// description: 不動産屋に出す説明（数値は出さず、あいまいに伝える）
export type BuildingDef = {
  name: string;
  cost: number;
  description: string;
};

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  house: { name: '一軒家', cost: 20_000, description: '休息の回復量が増える' },
  mansion: { name: 'マンション', cost: 100_000, description: '家賃収入が入る' },
  store: { name: '店舗', cost: 60_000, description: '売上が入る。近い職業や特定の能力が高いとうまくいく' },
};

// マンション: 収入 = 土地の価格 × incomeRate。教養が高いと滞納が減り、表現力が高いと満室になりやすい
export const MANSION = {
  incomeRate: 0.1,
  chance: 0.1, // 対象の行動1回あたりの収入イベントの発生確率
  outcomes: [
    { id: 'rent', text: '家賃が入った', tone: 'good', weight: 70, income: 1 },
    { id: 'full_occupancy', text: '満室になった', tone: 'good', weight: 10, income: 2 },
    { id: 'arrears', text: '家賃を滞納された', tone: 'bad', weight: 15, income: 0 },
    { id: 'repair', text: '修繕費がかかった', tone: 'bad', weight: 5, money: -10_000 },
    { id: 'noise', text: '住人どうしの騒音トラブルに対応した', tone: 'bad', weight: 5, income: 1, condition: -10 },
  ] satisfies IncomeOutcome[],
  // 能力による重みの補正（能力 10 ごとに ±1）
  fullOccupancyAbility: 'japanese' as AbilityKey,
  arrearsAbility: 'social' as AbilityKey,
} as const;

export type StoreDef = {
  name: string;
  description: string;
  incomeRate: number; // 基本の売上 = 土地の価格 × incomeRate
  chance: number;
  abilities: readonly AbilityKey[]; // 売上に効く能力
  jobs: readonly string[]; // 相性の良い職業（系統）
  outcomes: readonly IncomeOutcome[];
};

export const STORES: Record<StoreKind, StoreDef> = {
  // 安定型: 振れ幅が小さく、売上イベントが起きやすい
  convenience: {
    name: 'コンビニ',
    description: '安定型',
    incomeRate: 0.15,
    chance: 0.15,
    abilities: ['math', 'social'],
    jobs: JOB_LINES.parttime,
    outcomes: [
      { id: 'sales', text: '売上が入った', tone: 'good', weight: 75, income: 1 },
      { id: 'field_trip', text: '近所に学校の遠足が来た', tone: 'good', weight: 10, income: 2 },
      { id: 'shoplifting', text: '万引きされた', tone: 'bad', weight: 10, money: -3_000 },
      { id: 'robbery', text: '強盗が入った', tone: 'bad', weight: 3, robbery: true },
    ],
  },
  // 中間型
  restaurant: {
    name: 'レストラン',
    description: '当たれば大きい',
    incomeRate: 0.15,
    chance: 0.1,
    abilities: ['art', 'science'],
    jobs: JOB_LINES.curry,
    outcomes: [
      { id: 'sales', text: '売上が入った', tone: 'good', weight: 60, income: 1 },
      { id: 'gourmet_magazine', text: 'グルメ雑誌に載った', tone: 'good', weight: 10, income: 3 },
      { id: 'food_poisoning', text: '食中毒を出してしまった', tone: 'bad', weight: 5, money: -20_000, condition: -10 },
      { id: 'no_customers', text: '閑古鳥が鳴いた', tone: 'bad', weight: 15, income: 0 },
      { id: 'robbery', text: '強盗が入った', tone: 'bad', weight: 4, robbery: true },
    ],
  },
  // ハイリスク型: 振れ幅がいちばん大きい
  bar: {
    name: 'バー',
    description: '浮き沈みが激しい',
    incomeRate: 0.15,
    chance: 0.1,
    abilities: ['music', 'love'],
    jobs: JOB_LINES.bar,
    outcomes: [
      { id: 'sales', text: '売上が入った', tone: 'good', weight: 50, income: 1 },
      { id: 'big_spender', text: '太客がボトルを入れた', tone: 'good', weight: 12, income: 4 },
      { id: 'rampage', text: '酔客が暴れて店が壊れた', tone: 'bad', weight: 8, money: -15_000 },
      { id: 'no_customers', text: '閑古鳥が鳴いた', tone: 'bad', weight: 20, income: 0 },
      { id: 'robbery', text: '強盗が入った', tone: 'bad', weight: 4, robbery: true },
    ],
  },
};

export function buildingName(building: BuildingType, storeKind: StoreKind | null): string {
  return building === 'store' && storeKind ? `${BUILDINGS.store.name}（${STORES[storeKind].name}）` : BUILDINGS[building].name;
}

// 自分のプロパティだけを見る（'constructor' などのプロトタイプのキーを通さない）
export function isBuildingType(value: unknown): value is BuildingType {
  return typeof value === 'string' && Object.hasOwn(BUILDINGS, value);
}

export function isStoreKind(value: unknown): value is StoreKind {
  return typeof value === 'string' && Object.hasOwn(STORES, value);
}

// 評価額（土地の価格 + 建築費）と売却額
export function propertyValue(landPrice: number, building: BuildingType): number {
  return landPrice + BUILDINGS[building].cost;
}

export function sellPrice(landPrice: number, building: BuildingType): number {
  return Math.floor(propertyValue(landPrice, building) * REALESTATE.sellRate);
}
