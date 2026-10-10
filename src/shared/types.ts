import type { Abilities } from './abilities';
import type { BuildingType, StoreKind } from './master/buildings';
import type { MapCell } from './master/map';

export type UserRef = { id: number; name: string };

export type Gauge = { current: number; max: number };

// GET /api/me のレスポンス
export type Me = {
  id: number;
  name: string;
  money: number;
  deposit: number;
  totalAssets: number;
  job: { id: string; name: string; level: number }; // level: 今の職業の職業レベル
  bodyPower: Gauge;
  brainPower: Gauge;
  condition: number;
  height: number;
  weight: number; // kg（0.1kg 単位）
  bmi: number;
  fullness: number;
  lover: UserRef | null;
  spouse: UserRef | null;
  abilities: Abilities;
  brainTotal: number;
  bodyTotal: number;
  soupKitchenCount: number;
};

// GET /api/events のレスポンス要素
export type EventItem = { id: number; message: string; createdAt: string };

// GET /api/map のレスポンス要素。空き地には所有者（未購入なら null）が付く
// 土地: 所有者がいれば owner と建物（building / storeKind）が入る
export type MapCellView =
  | Exclude<MapCell, { type: 'lot' }>
  | (Extract<MapCell, { type: 'lot' }> & {
      owner: UserRef | null;
      building: BuildingType | null;
      storeKind: StoreKind | null;
    });

// アクション系 API の共通レスポンス
// 行動中に起きた出来事（ランダムイベント・物件の収入。tone: 良い / 悪い出来事）
export type ActionEvent = { text: string; tone: 'good' | 'bad' };

export type ActionResult = { message: string; events?: ActionEvent[] };

// GET /api/jobs のレスポンス要素
export type JobView = {
  id: string;
  name: string;
  baseSalary: number;
  powerLabel: string;
  weightChange: number; // kg（マイナスで減る）
  depth: number; // 系統の深さ（基本職 = 0）
  promotionFrom: string | null; // 昇進元の職業名
  level: number; // この職業での職業レベル
  exp: number;
  nextExp: number | null; // 次のレベルに必要な経験値（最大レベルなら null）
  requirements: string[];
  unmet: string[];
  current: boolean;
};

// GET /api/items のレスポンス要素（所持アイテム）
export type InventoryItem = { itemId: string; quantity: number };

export type LoveRequestType = 'date' | 'propose';

// 恋愛の申し込み（incoming なら user は送り主、outgoing なら宛先）
export type LoveRequestView = { id: number; type: LoveRequestType; user: UserRef; createdAt: string };

// GET /api/love のレスポンス
export type LoveState = {
  lover: UserRef | null;
  spouse: UserRef | null;
  incoming: LoveRequestView[];
  outgoing: LoveRequestView[];
  // 交際を申し込める相手（自分以外で恋人・配偶者がいない住民）
  candidates: UserRef[];
};

// GET /api/residents のレスポンス要素（総資産の多い順）
export type ResidentView = {
  rank: number;
  id: number;
  name: string;
  jobName: string;
  totalAssets: number;
  lover: UserRef | null;
  spouse: UserRef | null;
};
