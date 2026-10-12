import type { ConsumableEffect } from './effects';

// 旅行先。費用（持ち金）と身体パワーを使い、効果（effect）は必ず得られる。お土産は souvenirs の確率で手に入る（それぞれ独立に抽選）
export type Travel = {
  id: string;
  name: string;
  cost: number;
  powerCost: number; // 身体パワー
  effect: ConsumableEffect;
  souvenirs: ReadonlyArray<{ itemId: string; chance: number }>;
};

export const TRAVELS: readonly Travel[] = [
  {
    id: 'onsen',
    name: '国内・温泉巡り',
    cost: 100_000,
    powerCost: 50,
    effect: { condition: 100, gain: { health: 3, stamina: 2 } },
    souvenirs: [
      { itemId: 'onsen_powder', chance: 0.5 },
      { itemId: 'golden_manju', chance: 0.2 },
    ],
  },
  {
    id: 'china',
    name: '中国・遺跡ツアー',
    cost: 500_000,
    powerCost: 100,
    effect: { condition: 20, gain: { social: 5, science: 3 } },
    souvenirs: [
      { itemId: 'kampo_medicine', chance: 0.5 },
      { itemId: 'seiryu_blade', chance: 0.08 },
      { itemId: 'silver_pistol', chance: 0.04 },
    ],
  },
  {
    id: 'italy',
    name: 'イタリア・グルメツアー',
    cost: 1_000_000,
    powerCost: 120,
    effect: { condition: 30, weight: 2, gain: { art: 5, music: 3, love: 2 } },
    souvenirs: [
      { itemId: 'prosciutto', chance: 0.5 },
      { itemId: 'blood_olive_oil', chance: 0.08 },
    ],
  },
  {
    id: 'brazil',
    name: 'ブラジル・アマゾン探索',
    cost: 2_000_000,
    powerCost: 200,
    effect: { condition: -20, weight: -2, gain: { stamina: 5, leg: 5, speed: 3 } },
    souvenirs: [
      { itemId: 'guarana_extract', chance: 0.5 },
      { itemId: 'yanomami_pendant', chance: 0.05 },
    ],
  },
  {
    id: 'egypt',
    name: 'エジプト・未知のピラミッド探索',
    cost: 5_000_000,
    powerCost: 250,
    effect: { condition: -10, gain: { science: 8, social: 5, language: 3 } },
    souvenirs: [
      { itemId: 'ancient_papyrus', chance: 0.5 },
      { itemId: 'prophecy_book', chance: 0.03 },
    ],
  },
];

// 体力が下がる過酷な旅行先（体力が 0 だと行けない）
export function isHardTravel(travel: Travel): boolean {
  return (travel.effect.condition ?? 0) < 0;
}

export function findTravel(id: string): Travel | undefined {
  return TRAVELS.find((t) => t.id === id);
}
