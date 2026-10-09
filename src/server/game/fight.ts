import type { Abilities } from '../../shared/abilities';
import { FIGHT } from '../../shared/config';
import { clamp, categoryTotal } from './status';

export function combatPower(abilities: Abilities, condition: number): number {
  const base = categoryTotal(abilities, 'body') + FIGHT.extraWeightAbilities.reduce((sum, key) => sum + abilities[key], 0);
  return Math.round(base * (0.5 + condition / 200));
}

export function winRate(mine: number, theirs: number): number {
  const [min, max] = FIGHT.winRateRange;
  return clamp(mine / (mine + theirs), min, max);
}
