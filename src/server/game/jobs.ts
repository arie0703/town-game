import type { Abilities } from '../../shared/abilities';
import { ABILITIES } from '../../shared/abilities';
import { WORK } from '../../shared/config';
import type { Job } from '../../shared/master/jobs';
import { bmi, categoryTotal } from './status';

function abilityLabel(key: string): string {
  return ABILITIES.find((a) => a.key === key)?.label ?? key;
}

// 就職条件を「数学 50以上」のような表示用の文字列と、満たしているかの判定結果で返す
function requirementChecks(job: Job, abilities: Abilities, bmiValue: number): Array<{ label: string; met: boolean }> {
  const r = job.requirements;
  const checks: Array<{ label: string; met: boolean }> = [];
  if (r.brainTotal !== undefined) {
    checks.push({ label: `頭脳合計 ${r.brainTotal}以上`, met: categoryTotal(abilities, 'brain') >= r.brainTotal });
  }
  if (r.bodyTotal !== undefined) {
    checks.push({ label: `身体合計 ${r.bodyTotal}以上`, met: categoryTotal(abilities, 'body') >= r.bodyTotal });
  }
  for (const [key, min] of Object.entries(r.abilities ?? {}) as Array<[keyof Abilities, number]>) {
    checks.push({ label: `${abilityLabel(key)} ${min}以上`, met: abilities[key] >= min });
  }
  if (r.bmiRange) {
    const [min, max] = r.bmiRange;
    checks.push({ label: `BMI ${min}〜${max}`, met: bmiValue >= min && bmiValue <= max });
  }
  return checks;
}

export function jobRequirements(
  job: Job,
  abilities: Abilities,
  height: number,
  weight: number,
): { all: string[]; unmet: string[] } {
  const checks = requirementChecks(job, abilities, bmi(height, weight));
  return { all: checks.map((c) => c.label), unmet: checks.filter((c) => !c.met).map((c) => c.label) };
}

export function salary(job: Job, condition: number): number {
  const rate = condition < WORK.lowConditionThreshold ? WORK.lowConditionSalaryRate : 1;
  return Math.floor(job.baseSalary * rate);
}
