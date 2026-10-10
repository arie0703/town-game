import type { Abilities } from '../../shared/abilities';
import { ABILITIES } from '../../shared/abilities';
import { WORK } from '../../shared/config';
import { yen } from '../../shared/format';
import { formatKg } from '../../shared/weight';
import { findJob, jobLevel, type Job } from '../../shared/master/jobs';
import type { Player } from './player';
import { bmi, categoryTotal } from './status';

function abilityLabel(key: string): string {
  return ABILITIES.find((a) => a.key === key)?.label ?? key;
}

// 就職・昇進の判定に使う住民の状態
export type JobContext = { player: Player; totalAssets: number };

// 就職条件を「論理力 50以上」のような表示用の文字列と、満たしているかの判定結果で返す
function requirementChecks(job: Job, { player, totalAssets }: JobContext): Array<{ label: string; met: boolean }> {
  const { user, abilities, jobExp } = player;
  const r = job.requirements;
  const checks: Array<{ label: string; met: boolean }> = [];
  if (job.promotion) {
    const p = job.promotion;
    const from = findJob(p.from);
    checks.push({
      label: `${from?.name ?? p.from} Lv${p.level} 以上で在職中`,
      met: user.job_id === p.from && jobLevel(jobExp[p.from] ?? 0) >= p.level,
    });
    if (p.totalAssets !== undefined) {
      checks.push({ label: `総資産 ${yen(p.totalAssets)}以上`, met: totalAssets >= p.totalAssets });
    }
  }
  if (r.brainTotal !== undefined) {
    checks.push({ label: `頭脳合計 ${r.brainTotal}以上`, met: categoryTotal(abilities, 'brain') >= r.brainTotal });
  }
  if (r.bodyTotal !== undefined) {
    checks.push({ label: `身体合計 ${r.bodyTotal}以上`, met: categoryTotal(abilities, 'body') >= r.bodyTotal });
  }
  for (const [key, min] of Object.entries(r.abilities ?? {}) as Array<[keyof Abilities, number]>) {
    checks.push({ label: `${abilityLabel(key)} ${min}以上`, met: abilities[key] >= min });
  }
  if (r.weightMin !== undefined) {
    checks.push({ label: `体重 ${formatKg(r.weightMin)}以上`, met: user.weight_g >= r.weightMin * 1000 });
  }
  if (r.bmiRange) {
    const [min, max] = r.bmiRange;
    const value = bmi(user.height, user.weight_g);
    checks.push({ label: `BMI ${min}〜${max}`, met: value >= min && value <= max });
  }
  return checks;
}

export function jobRequirements(job: Job, ctx: JobContext): { all: string[]; unmet: string[] } {
  const checks = requirementChecks(job, ctx);
  return { all: checks.map((c) => c.label), unmet: checks.filter((c) => !c.met).map((c) => c.label) };
}

export function salary(job: Job, condition: number): number {
  const rate = condition < WORK.lowConditionThreshold ? WORK.lowConditionSalaryRate : 1;
  return Math.floor(job.baseSalary * rate);
}
