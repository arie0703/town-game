import type { FacilityId } from './facilities';

// 町のマップ（15×15）。1文字 = 1マス
//   . = 道 / L = 空き地 / それ以外 = 施設（FACILITY_CHARS を参照）
const LAYOUT = [
  'LLL.LLL.LLL.LLL',
  'LLL.LLL.LLL.LLL',
  'LLL.LEL.LGL.LLL',
  '...............',
  'LLL.LLL.LLL.LLL',
  'LLL.LLL.LLL.LLL',
  'LLL.LLT.SBL.LLL',
  '...............',
  'LLL.LLC.JIL.LLL',
  'LLR.LLL.LLL.KLL',
  'LLL.LLL.LLL.LLL',
  '...............',
  'LLL.LLL.LLL.LLL',
  'LLL.LLL.LLL.LLL',
  'LLL.LLL.LLL.LLX',
];

const FACILITY_CHARS: Record<string, FacilityId> = {
  S: 'shop',
  J: 'job',
  E: 'school',
  G: 'gym',
  C: 'cafeteria',
  K: 'casino',
  R: 'realestate',
  T: 'townhall',
  I: 'izakaya',
  B: 'bank',
  X: 'blackmarket',
};

export const MAP_WIDTH = 15;
export const MAP_HEIGHT = 15;

export type MapCell =
  | { id: number; x: number; y: number; type: 'road' }
  | { id: number; x: number; y: number; type: 'lot'; landPrice: number }
  | { id: number; x: number; y: number; type: 'facility'; facilityId: FacilityId };

// 土地の価格: 町の中心に近いほど高い（実際の空き地は 5,000〜60,000円）
function landPrice(x: number, y: number): number {
  const center = Math.floor(MAP_WIDTH / 2);
  const distance = Math.abs(x - center) + Math.abs(y - center);
  return 5_000 + (MAP_WIDTH - 1 - distance) * 5_000;
}

export const MAP_CELLS: MapCell[] = LAYOUT.flatMap((row, y) =>
  [...row].map((char, x): MapCell => {
    const id = y * MAP_WIDTH + x;
    if (char === '.') return { id, x, y, type: 'road' };
    if (char === 'L') return { id, x, y, type: 'lot', landPrice: landPrice(x, y) };
    const facilityId = FACILITY_CHARS[char];
    if (!facilityId) throw new Error(`Unknown map char: ${char}`);
    return { id, x, y, type: 'facility', facilityId };
  }),
);
