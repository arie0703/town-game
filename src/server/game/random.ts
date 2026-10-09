import { randomInt } from 'node:crypto';

// [min, max] の整数
export function randomIntInclusive(min: number, max: number): number {
  return randomInt(min, max + 1);
}

// 確率 p で true
export function chance(p: number): boolean {
  return randomInt(0, 1_000_000) < p * 1_000_000;
}

export function pickRandom<T>(list: readonly T[]): T {
  return list[randomInt(0, list.length)];
}
