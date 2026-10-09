import type { Abilities } from '../abilities';

export type JobRequirements = {
  brainTotal?: number;
  bodyTotal?: number;
  abilities?: Partial<Abilities>;
  bmiRange?: readonly [number, number];
};

export type Job = {
  id: string;
  name: string;
  baseSalary: number;
  requirements: JobRequirements;
  power: { type: 'body' | 'brain'; cost: number };
  conditionCost: number;
  fullnessCost: number;
  // 1回働くと減る体重（kg）。身体を使う仕事ほど多い
  weightLoss: number;
  abilityGain: Partial<Abilities>;
};

// 職業マスタ
export const JOBS: readonly Job[] = [
  {
    id: 'none',
    name: '無職',
    baseSalary: 0,
    requirements: {},
    power: { type: 'body', cost: 0 },
    conditionCost: 0,
    fullnessCost: 0,
    weightLoss: 0,
    abilityGain: {},
  },
  {
    id: 'parttime',
    name: 'アルバイト',
    baseSalary: 800,
    requirements: {},
    power: { type: 'body', cost: 20 },
    conditionCost: 5,
    fullnessCost: 10,
    weightLoss: 0.5,
    abilityGain: { stamina: 1 },
  },
  {
    id: 'office',
    name: '会社員',
    baseSalary: 2_000,
    requirements: { brainTotal: 200 },
    power: { type: 'brain', cost: 25 },
    conditionCost: 6,
    fullnessCost: 10,
    weightLoss: 0.2,
    abilityGain: { social: 1, language: 1 },
  },
  {
    id: 'teacher',
    name: '教師',
    baseSalary: 2_500,
    requirements: { abilities: { japanese: 40, social: 40 } },
    power: { type: 'brain', cost: 30 },
    conditionCost: 7,
    fullnessCost: 10,
    weightLoss: 0.3,
    abilityGain: { japanese: 1, social: 1 },
  },
  {
    id: 'programmer',
    name: 'プログラマー',
    baseSalary: 3_000,
    requirements: { abilities: { math: 50 } },
    power: { type: 'brain', cost: 35 },
    conditionCost: 8,
    fullnessCost: 12,
    weightLoss: 0.1,
    abilityGain: { math: 1, science: 1 },
  },
  {
    id: 'athlete',
    name: 'スポーツ選手',
    baseSalary: 3_500,
    requirements: { bodyTotal: 220 },
    power: { type: 'body', cost: 40 },
    conditionCost: 10,
    fullnessCost: 15,
    weightLoss: 0.8,
    abilityGain: { stamina: 1, speed: 1, power: 1 },
  },
  {
    id: 'model',
    name: 'モデル',
    baseSalary: 3_000,
    requirements: { abilities: { looks: 50 }, bmiRange: [18.5, 22] },
    power: { type: 'body', cost: 30 },
    conditionCost: 6,
    fullnessCost: 8,
    weightLoss: 0.5,
    abilityGain: { looks: 1 },
  },
  {
    id: 'comedian',
    name: '芸人',
    baseSalary: 2_000,
    requirements: { abilities: { humor: 40 } },
    power: { type: 'brain', cost: 25 },
    conditionCost: 6,
    fullnessCost: 10,
    weightLoss: 0.3,
    abilityGain: { humor: 1 },
  },
];

export function findJob(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id);
}

export function jobName(jobId: string): string {
  return findJob(jobId)?.name ?? '不明';
}
