import { effectParts, type ConsumableEffect, type EffectPart } from '../../shared/master/effects';

function chipsHtml(parts: EffectPart[]): string {
  return `<div class="effect-row">${parts.map((p) => `<span class="chip chip-${p.tone}">${p.text}</span>`).join('')}</div>`;
}

// 効果がない列は「−」を表示する
const EMPTY = '<span class="muted">−</span>';

// 体調の列: 満腹度・パワー（回復）の行と、コンディション・体重・身長（体）の行に分けて表示する
export function conditionEffectHtml(effect: ConsumableEffect): string {
  const parts = effectParts(effect);
  const rows = (['recover', 'body'] as const)
    .map((group) => parts.filter((p) => p.group === group))
    .filter((row) => row.length > 0)
    .map(chipsHtml);
  return rows.length > 0 ? `<div class="effect">${rows.join('')}</div>` : EMPTY;
}

// 能力の列: 能力の増減を表示する
export function abilityEffectHtml(effect: ConsumableEffect): string {
  const parts = effectParts(effect).filter((p) => p.group === 'ability');
  return parts.length > 0 ? `<div class="effect">${chipsHtml(parts)}</div>` : EMPTY;
}
