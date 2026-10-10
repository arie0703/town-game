import type { AbilityKey } from '../../shared/abilities';
import { GOODNESS, isBad, isGood } from '../../shared/goodness';
import { buildingName, MANSION, REALESTATE, STORES, type IncomeOutcome } from '../../shared/master/buildings';
import { MAP_CELLS } from '../../shared/master/map';
import { describeEventEffect, type EventEffect } from '../../shared/master/random-events';
import type { ActionEvent } from '../../shared/types';
import type { Player, PlayerChange } from './player';
import { chance, randomFloat } from './random';
import { applyEventEffect, mergeChange } from './random-events';
import { clamp } from './status';

type Land = Player['lands'][number];

// 重みで1つ選ぶ（重みは小数でもよい）
function pickWeighted(outcomes: readonly IncomeOutcome[], weightOf: (o: IncomeOutcome) => number): IncomeOutcome {
  const weights = outcomes.map((o) => Math.max(0, weightOf(o)));
  let r = randomFloat() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < outcomes.length; i++) {
    r -= weights[i];
    if (r < 0) return outcomes[i];
  }
  return outcomes[0];
}

// 能力による売上の補正（対象の能力の平均で決まる）
function abilityRate(player: Player, keys: readonly AbilityKey[]): number {
  const average = keys.reduce((sum, key) => sum + player.abilities[key], 0) / keys.length;
  const [min, max] = REALESTATE.abilityRateRange;
  return clamp(1 + (average - REALESTATE.abilityBase) / REALESTATE.abilityDivisor, min, max);
}

// 物件1件の収入イベントを抽選する。起きなければ null
function drawIncome(player: Player, land: Land): { outcome: IncomeOutcome; income: number } | null {
  const cell = MAP_CELLS[land.cell_id];
  if (cell?.type !== 'lot') return null;

  if (land.building === 'mansion') {
    if (!chance(MANSION.chance)) return null;
    // 表現力 10 ごとに満室の重み +1、教養 10 ごとに滞納の重み -1。善（ヨイ以上）は住人に信用され、滞納がさらに減る
    const outcome = pickWeighted(MANSION.outcomes, (o) => {
      if (o.id === 'full_occupancy') return o.weight + Math.floor(player.abilities[MANSION.fullOccupancyAbility] / 10);
      if (o.id === 'arrears') {
        const weight = Math.max(2, o.weight - Math.floor(player.abilities[MANSION.arrearsAbility] / 10));
        return isGood(player.user.goodness) ? weight * GOODNESS.goodArrearsWeightRate : weight;
      }
      return o.weight;
    });
    return { outcome, income: Math.floor(cell.landPrice * MANSION.incomeRate) };
  }

  if (land.building === 'store' && land.store_kind) {
    const store = STORES[land.store_kind];
    if (!chance(store.chance)) return null;
    const jobRate = store.jobs.includes(player.user.job_id) ? REALESTATE.jobLineRate : 1;
    const income = Math.floor(cell.landPrice * store.incomeRate * abilityRate(player, store.abilities) * jobRate);
    // 悪（ワル以下）の店舗は裏の顔が利くので、強盗が来にくい
    const robberyRate = isBad(player.user.goodness) ? GOODNESS.badRobberyWeightRate : 1;
    return { outcome: pickWeighted(store.outcomes, (o) => (o.robbery ? o.weight * robberyRate : o.weight)), income };
  }
  return null;
}

// 強盗: 身体パワーが高いほど撃退しやすい。撃退すれば賞金、失敗すれば収入 × 2 を失う
function robberyEffect(player: Player, income: number): { effect: EventEffect; text: string; tone: ActionEvent['tone'] } {
  const [min, max] = REALESTATE.robberyRepelRange;
  const repelRate = clamp(player.user.body_power / REALESTATE.robberyRepelDivisor, min, max);
  if (chance(repelRate)) {
    return {
      effect: { money: income * 2, bodyPower: -REALESTATE.robberyPowerCost },
      text: '強盗が入ったが撃退して賞金をもらった',
      tone: 'good',
    };
  }
  return { effect: { money: -income * 2 }, text: '強盗が入り売上を奪われた', tone: 'bad' };
}

// 所有しているマンション・店舗ごとに収入イベントを抽選し、効果を変更内容に重ねる
export function rollPropertyIncome(player: Player, change: PlayerChange): { change: PlayerChange; events: ActionEvent[] } {
  const events: ActionEvent[] = [];
  let current = change;
  for (const land of player.lands) {
    const drawn = drawIncome(mergeChange(player, current), land);
    if (!drawn) continue;
    const { outcome, income } = drawn;
    const state = mergeChange(player, current);
    const result = outcome.robbery
      ? robberyEffect(state, income)
      : {
          effect: { money: income * (outcome.income ?? 0) + (outcome.money ?? 0), condition: outcome.condition },
          text: outcome.text,
          tone: outcome.tone,
        };
    const applied = applyEventEffect(player, current, result.effect);
    current = applied.change;
    const cell = MAP_CELLS[land.cell_id];
    const pos = cell ? `${cell.x + 1}-${cell.y + 1}` : '';
    const detail = describeEventEffect(applied.applied);
    events.push({
      text: `${buildingName(land.building, land.store_kind)}(${pos}): ${result.text}${detail ? `（${detail}）` : ''}`,
      tone: result.tone,
    });
  }
  return { change: current, events };
}
