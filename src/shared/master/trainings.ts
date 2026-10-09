import type { Abilities } from '../abilities';
import { describeGain } from './effects';
import { formatKg } from '../weight';

// ジムの種目・学校の授業。gain はコンディションが良いとき（80以上）の上昇量
// ジムは身体パワー、学校は頭脳パワーを消費する
export type Training = {
  id: string;
  name: string;
  facility: 'gym' | 'school';
  powerCost: number;
  fee: number;
  fullnessCost: number;
  weight?: number; // 体重の増減（kg）
  condition?: number; // コンディションの増減
  gain: Partial<Abilities>;
};

export const TRAININGS: readonly Training[] = [
  // ジム
  { id: 'bench_press', name: 'ベンチプレス', facility: 'gym', powerCost: 25, fee: 500, fullnessCost: 10, weight: -0.3, gain: { power: 2, arm: 2 } },
  { id: 'running', name: 'ランニング', facility: 'gym', powerCost: 20, fee: 300, fullnessCost: 15, weight: -1.0, gain: { leg: 2, stamina: 2 } },
  { id: 'squat', name: 'スクワット', facility: 'gym', powerCost: 20, fee: 400, fullnessCost: 10, weight: -0.5, gain: { leg: 3, power: 1 } },
  { id: 'dash', name: '短距離ダッシュ', facility: 'gym', powerCost: 20, fee: 400, fullnessCost: 10, weight: -0.6, gain: { speed: 3, leg: 1 } },
  { id: 'boxing', name: 'シャドーボクシング', facility: 'gym', powerCost: 20, fee: 400, fullnessCost: 10, weight: -0.5, gain: { arm: 2, speed: 1 } },
  { id: 'yoga', name: 'ヨガ', facility: 'gym', powerCost: 15, fee: 600, fullnessCost: 5, weight: -0.3, condition: 5, gain: { health: 2, looks: 1 } },
  // 学校
  { id: 'japanese', name: '現代文', facility: 'school', powerCost: 20, fee: 500, fullnessCost: 5, gain: { japanese: 3 } },
  { id: 'math', name: '数学演習', facility: 'school', powerCost: 20, fee: 500, fullnessCost: 5, gain: { math: 3 } },
  { id: 'science', name: '理科実験', facility: 'school', powerCost: 25, fee: 600, fullnessCost: 5, gain: { science: 3, math: 1 } },
  { id: 'history', name: '日本史', facility: 'school', powerCost: 20, fee: 500, fullnessCost: 5, gain: { social: 3 } },
  { id: 'english', name: '英会話', facility: 'school', powerCost: 20, fee: 600, fullnessCost: 5, gain: { language: 3, humor: 1 } },
  { id: 'music', name: '音楽', facility: 'school', powerCost: 15, fee: 500, fullnessCost: 5, gain: { music: 3, love: 1 } },
  { id: 'art', name: '美術', facility: 'school', powerCost: 15, fee: 500, fullnessCost: 5, gain: { art: 3, looks: 1 } },
  { id: 'cooking', name: '調理実習', facility: 'school', powerCost: 15, fee: 700, fullnessCost: 0, condition: 5, gain: { art: 1, health: 2 } },
  { id: 'manzai', name: '漫才研究会', facility: 'school', powerCost: 20, fee: 400, fullnessCost: 5, gain: { humor: 3, japanese: 1 } },
];

export function findTraining(id: string): Training | undefined {
  return TRAININGS.find((t) => t.id === id);
}

export function describeTraining(t: Training): string {
  const parts = [describeGain(t.gain)];
  if (t.condition) parts.push(`コンディション ${t.condition > 0 ? '+' : ''}${t.condition}`);
  if (t.weight) parts.push(`体重 ${t.weight > 0 ? '+' : '-'}${formatKg(Math.abs(t.weight))}`);
  return parts.join(' / ');
}
