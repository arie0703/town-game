import type { Abilities } from '../abilities';
import { JOB_LEVEL } from '../config';

export type JobRequirements = {
  brainTotal?: number;
  bodyTotal?: number;
  abilities?: Partial<Abilities>;
  bmiRange?: readonly [number, number];
  weightMin?: number; // 体重（kg）の下限
  goodnessMin?: number; // 善悪の下限（20 = ヨイ以上、60 = 激ヨイ以上）
};

// 上位職への昇進条件。from の職業に就いていて、その職業レベルが level 以上、総資産が totalAssets 以上であること
export type JobPromotion = {
  from: string;
  level: number;
  totalAssets?: number;
};

export type Job = {
  id: string;
  name: string;
  baseSalary: number;
  requirements: JobRequirements;
  promotion?: JobPromotion;
  power: { type: 'body' | 'brain'; cost: number };
  conditionCost: number;
  fullnessCost: number;
  // 1回働いたときの体重の増減（kg）。マイナスで減る（身体を使う仕事ほど減る）
  weightChange: number;
  abilityGain: Partial<Abilities>;
};

const body = (cost: number) => ({ type: 'body' as const, cost });
const brain = (cost: number) => ({ type: 'brain' as const, cost });

// 職業マスタ。上位職は promotion.from（昇進元）の直後に並べる
export const JOBS: readonly Job[] = [
  { id: 'none', name: '無職', baseSalary: 0, requirements: {}, power: body(0), conditionCost: 0, fullnessCost: 0, weightChange: 0, abilityGain: {} },

  // アルバイト系
  { id: 'parttime', name: 'アルバイト', baseSalary: 800, requirements: {}, power: body(20), conditionCost: 5, fullnessCost: 10, weightChange: -0.5, abilityGain: { stamina: 1 } },
  { id: 'part_leader', name: 'バイトリーダー', baseSalary: 1_500, requirements: { bodyTotal: 170 }, promotion: { from: 'parttime', level: 3 }, power: body(25), conditionCost: 6, fullnessCost: 10, weightChange: -0.6, abilityGain: { stamina: 1, social: 1 } },
  { id: 'store_manager', name: '店長', baseSalary: 3_000, requirements: { bodyTotal: 180, brainTotal: 180 }, promotion: { from: 'part_leader', level: 4, totalAssets: 100_000 }, power: brain(30), conditionCost: 8, fullnessCost: 10, weightChange: -0.3, abilityGain: { social: 2, math: 1 } },

  // 教師系
  { id: 'teacher', name: '教師', baseSalary: 2_500, requirements: { abilities: { japanese: 40, social: 40 }, goodnessMin: 20 }, power: brain(30), conditionCost: 7, fullnessCost: 10, weightChange: -0.3, abilityGain: { japanese: 1, social: 1 } },
  { id: 'vice_principal', name: '教頭', baseSalary: 4_000, requirements: { abilities: { japanese: 70, social: 70 }, goodnessMin: 20 }, promotion: { from: 'teacher', level: 4 }, power: brain(35), conditionCost: 8, fullnessCost: 10, weightChange: -0.2, abilityGain: { japanese: 2, social: 2 } },
  { id: 'principal', name: '校長', baseSalary: 6_000, requirements: { abilities: { japanese: 100, social: 100 }, goodnessMin: 60 }, promotion: { from: 'vice_principal', level: 5, totalAssets: 200_000 }, power: brain(40), conditionCost: 9, fullnessCost: 10, weightChange: 0.1, abilityGain: { japanese: 3, social: 3 } },

  // プログラマー系
  { id: 'programmer', name: 'プログラマー', baseSalary: 3_000, requirements: { abilities: { math: 50 } }, power: brain(35), conditionCost: 8, fullnessCost: 12, weightChange: -0.1, abilityGain: { math: 1, science: 1 } },
  { id: 'senior_engineer', name: 'シニアエンジニア', baseSalary: 5_000, requirements: { abilities: { math: 80, science: 50 } }, promotion: { from: 'programmer', level: 4 }, power: brain(40), conditionCost: 9, fullnessCost: 14, weightChange: 0, abilityGain: { math: 2, science: 2 } },
  { id: 'cto', name: 'CTO', baseSalary: 8_000, requirements: { abilities: { math: 120, science: 80 } }, promotion: { from: 'senior_engineer', level: 5, totalAssets: 300_000 }, power: brain(45), conditionCost: 10, fullnessCost: 14, weightChange: 0.2, abilityGain: { math: 3, science: 3, language: 1 } },

  // フィットネストレーナー系
  { id: 'fitness_trainer', name: 'フィットネストレーナー', baseSalary: 3_500, requirements: { bodyTotal: 220 }, power: body(40), conditionCost: 10, fullnessCost: 15, weightChange: -0.8, abilityGain: { stamina: 1, speed: 1, power: 1 } },
  { id: 'personal_trainer', name: 'パーソナルトレーナー', baseSalary: 5_000, requirements: { bodyTotal: 280 }, promotion: { from: 'fitness_trainer', level: 4 }, power: body(45), conditionCost: 11, fullnessCost: 16, weightChange: -1.0, abilityGain: { stamina: 2, power: 2, arm: 1 } },
  { id: 'gym_owner', name: 'ジムオーナー', baseSalary: 8_000, requirements: { bodyTotal: 340, brainTotal: 200 }, promotion: { from: 'personal_trainer', level: 5, totalAssets: 300_000 }, power: body(50), conditionCost: 12, fullnessCost: 18, weightChange: -1.2, abilityGain: { stamina: 2, power: 2, arm: 2, social: 1 } },

  // モデル系
  { id: 'model', name: 'モデル', baseSalary: 3_000, requirements: { abilities: { looks: 50 }, bmiRange: [18.5, 22] }, power: body(30), conditionCost: 6, fullnessCost: 8, weightChange: -0.5, abilityGain: { looks: 1 } },
  { id: 'popular_model', name: '人気モデル', baseSalary: 5_000, requirements: { abilities: { looks: 80 }, bmiRange: [18.5, 22] }, promotion: { from: 'model', level: 4 }, power: body(35), conditionCost: 7, fullnessCost: 8, weightChange: -0.6, abilityGain: { looks: 2, love: 1 } },
  { id: 'top_model', name: 'トップモデル', baseSalary: 9_000, requirements: { abilities: { looks: 120, love: 60 }, bmiRange: [18.5, 22] }, promotion: { from: 'popular_model', level: 5, totalAssets: 200_000 }, power: body(40), conditionCost: 8, fullnessCost: 8, weightChange: -0.7, abilityGain: { looks: 3, love: 2 } },

  // 芸人系
  { id: 'comedian', name: '芸人', baseSalary: 2_000, requirements: { abilities: { humor: 40 } }, power: brain(25), conditionCost: 6, fullnessCost: 10, weightChange: -0.3, abilityGain: { humor: 1 } },
  { id: 'popular_comedian', name: '売れっ子芸人', baseSalary: 4_500, requirements: { abilities: { humor: 80 } }, promotion: { from: 'comedian', level: 4 }, power: brain(30), conditionCost: 7, fullnessCost: 10, weightChange: -0.2, abilityGain: { humor: 2, japanese: 1 } },
  { id: 'grand_master', name: '大御所', baseSalary: 9_000, requirements: { abilities: { humor: 130 } }, promotion: { from: 'popular_comedian', level: 5, totalAssets: 300_000 }, power: brain(35), conditionCost: 8, fullnessCost: 10, weightChange: 0.3, abilityGain: { humor: 3, japanese: 2 } },

  // 力士系（体重が条件。体重が下回っても降格はしない）
  { id: 'sumo_trainee', name: '前相撲', baseSalary: 2_200, requirements: { weightMin: 80, abilities: { power: 40 } }, power: body(35), conditionCost: 8, fullnessCost: 18, weightChange: 0.4, abilityGain: { power: 1, stamina: 1 } },
  { id: 'makushita', name: '幕下', baseSalary: 4_200, requirements: { weightMin: 100, abilities: { power: 60, arm: 50 } }, promotion: { from: 'sumo_trainee', level: 3 }, power: body(40), conditionCost: 9, fullnessCost: 20, weightChange: 0.4, abilityGain: { power: 2, arm: 1, stamina: 1 } },
  { id: 'yokozuna', name: '横綱', baseSalary: 9_500, requirements: { weightMin: 120, abilities: { power: 90, arm: 80, stamina: 70 } }, promotion: { from: 'makushita', level: 5, totalAssets: 300_000 }, power: body(50), conditionCost: 10, fullnessCost: 22, weightChange: 0.3, abilityGain: { power: 3, arm: 2, stamina: 2 } },

  // 総合格闘家系
  { id: 'mma_trainee', name: '道場生', baseSalary: 2_200, requirements: { bodyTotal: 200, abilities: { arm: 40 } }, power: body(32), conditionCost: 9, fullnessCost: 14, weightChange: -0.8, abilityGain: { power: 1, speed: 1 } },
  { id: 'mma_fighter', name: '総合格闘家', baseSalary: 4_500, requirements: { bodyTotal: 260, abilities: { arm: 60, speed: 50 } }, promotion: { from: 'mma_trainee', level: 3 }, power: body(40), conditionCost: 11, fullnessCost: 16, weightChange: -0.8, abilityGain: { arm: 2, speed: 1, leg: 1 } },
  { id: 'mma_champion', name: 'チャンピオン', baseSalary: 9_500, requirements: { bodyTotal: 340, abilities: { arm: 90, speed: 80 } }, promotion: { from: 'mma_fighter', level: 5, totalAssets: 500_000 }, power: body(48), conditionCost: 12, fullnessCost: 18, weightChange: -0.5, abilityGain: { power: 2, arm: 2, speed: 2, leg: 1 } },

  // カレー屋系（スパイスの研究に探究心、本場の知識に国際感覚が必要。試食で満腹度はあまり減らず、太る）
  { id: 'curry_shop', name: '町のカレー屋', baseSalary: 2_300, requirements: { abilities: { science: 45, language: 45 } }, power: brain(28), conditionCost: 6, fullnessCost: 5, weightChange: 0.3, abilityGain: { science: 1, language: 1 } },
  { id: 'curry_chef', name: '本格カレー店主', baseSalary: 4_200, requirements: { abilities: { science: 65, language: 65, art: 40 } }, promotion: { from: 'curry_shop', level: 3 }, power: brain(34), conditionCost: 7, fullnessCost: 4, weightChange: 0.3, abilityGain: { science: 2, language: 1, art: 1 } },
  { id: 'curry_master', name: '行列のカレー職人', baseSalary: 8_500, requirements: { abilities: { science: 95, language: 95, art: 60 } }, promotion: { from: 'curry_chef', level: 4, totalAssets: 200_000 }, power: brain(40), conditionCost: 8, fullnessCost: 3, weightChange: 0.4, abilityGain: { science: 2, language: 2, art: 2 } },

  // バーテンダー系
  { id: 'bar_trainee', name: 'バー見習い', baseSalary: 2_300, requirements: { abilities: { language: 45, love: 35 } }, power: body(28), conditionCost: 7, fullnessCost: 10, weightChange: 0.1, abilityGain: { language: 1, humor: 1 } },
  { id: 'bartender', name: 'バーテンダー', baseSalary: 4_200, requirements: { abilities: { language: 65, love: 55 } }, promotion: { from: 'bar_trainee', level: 3 }, power: brain(32), conditionCost: 8, fullnessCost: 10, weightChange: 0.2, abilityGain: { language: 2, music: 1, love: 1 } },
  { id: 'master_bartender', name: 'マスターバーテンダー', baseSalary: 8_800, requirements: { abilities: { language: 95, love: 85, humor: 50 } }, promotion: { from: 'bartender', level: 5, totalAssets: 400_000 }, power: brain(40), conditionCost: 9, fullnessCost: 10, weightChange: 0.3, abilityGain: { language: 2, love: 2, humor: 2 } },
];

export function findJob(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id);
}

export function jobName(jobId: string): string {
  return findJob(jobId)?.name ?? '不明';
}

// 系統の深さ（基本職 = 0、その上位職 = 1 ...）
export function jobDepth(job: Job): number {
  const from = job.promotion ? findJob(job.promotion.from) : undefined;
  return from ? jobDepth(from) + 1 : 0;
}

// 経験値から職業レベル（1〜）を求める
export function jobLevel(exp: number): number {
  return JOB_LEVEL.expThresholds.filter((t) => exp >= t).length;
}

// 次のレベルに必要な経験値（最大レベルなら null）
export function nextLevelExp(exp: number): number | null {
  return JOB_LEVEL.expThresholds.find((t) => t > exp) ?? null;
}

// 職業の系統（下位職 → 上位職）
export const JOB_LINES = {
  parttime: ['parttime', 'part_leader', 'store_manager'],
  teacher: ['teacher', 'vice_principal', 'principal'],
  programmer: ['programmer', 'senior_engineer', 'cto'],
  trainer: ['fitness_trainer', 'personal_trainer', 'gym_owner'],
  model: ['model', 'popular_model', 'top_model'],
  comedian: ['comedian', 'popular_comedian', 'grand_master'],
  sumo: ['sumo_trainee', 'makushita', 'yokozuna'],
  mma: ['mma_trainee', 'mma_fighter', 'mma_champion'],
  curry: ['curry_shop', 'curry_chef', 'curry_master'],
  bar: ['bar_trainee', 'bartender', 'master_bartender'],
} as const;
