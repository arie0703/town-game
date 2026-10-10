import type { Abilities } from '../../shared/abilities';
import { LIMITS, RANDOM_EVENT } from '../../shared/config';
import {
  describeEventEffect,
  RANDOM_EVENTS,
  type ActionKind,
  type EventContext,
  type EventEffect,
  type EventState,
  type RandomEvent,
} from '../../shared/master/random-events';
import type { ActionEvent } from '../../shared/types';
import type { Player, PlayerChange } from './player';
import { addAbilities } from './player';
import { chance, randomIntInclusive } from './random';
import { addWeight, clamp, maxPowers } from './status';

// 発生判定 → 対象の行動・条件で候補を絞り、重みで1つ選ぶ。起きなければ null
function drawEvent(kind: ActionKind, state: EventState, ctx: EventContext): RandomEvent | null {
  if (!chance(RANDOM_EVENT.rate)) return null;
  const candidates = RANDOM_EVENTS.filter(
    (e) =>
      (e.actions === 'all' || e.actions.includes(kind)) &&
      (!e.jobs || e.jobs.includes(state.jobId)) &&
      (e.when?.(state, ctx) ?? true),
  );
  const total = candidates.reduce((sum, e) => sum + e.weight, 0);
  if (total === 0) return null;
  let r = randomIntInclusive(1, total);
  for (const e of candidates) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return null;
}

// 行動の変更内容を反映した後の Player
export function mergeChange(player: Player, change: PlayerChange): Player {
  return {
    user: { ...player.user, ...change.user } as Player['user'],
    abilities: { ...player.abilities, ...change.abilities },
    items: { ...player.items, ...change.items },
    jobExp: { ...player.jobExp, ...change.jobExp },
    lands: player.lands,
  };
}

// 行動の変更内容にイベントの効果を重ねる。値は 0 未満・上限超えにならないよう丸め、
// 説明には実際に反映された量を使う（例: 持ち金 50円 で -100円 → -50円）
export function applyEventEffect(
  player: Player,
  change: PlayerChange,
  effect: EventEffect,
): { change: PlayerChange; applied: EventEffect } {
  const { user, abilities, items, jobExp } = mergeChange(player, change);
  const gained = addAbilities(abilities, effect.gain ?? {});
  const max = maxPowers({ ...abilities, ...gained } as Abilities);

  const money = Math.max(0, user.money + (effect.money ?? 0));
  const fullness = clamp(user.fullness + (effect.fullness ?? 0), 0, LIMITS.fullnessMax);
  const bodyPower = clamp(user.body_power + (effect.bodyPower ?? 0), 0, max.body);
  const brainPower = clamp(user.brain_power + (effect.brainPower ?? 0), 0, max.brain);
  const condition = clamp(user.condition + (effect.condition ?? 0), 0, LIMITS.conditionMax);
  const weightG = addWeight(user.weight_g, effect.weight ?? 0);

  const nextItems: Record<string, number> = {};
  const appliedItems: Record<string, number> = {};
  for (const [itemId, delta] of Object.entries(effect.items ?? {})) {
    nextItems[itemId] = Math.max(0, (items[itemId] ?? 0) + delta);
    appliedItems[itemId] = nextItems[itemId] - (items[itemId] ?? 0);
  }
  const nextJobExp: Record<string, number> = {};
  if (effect.jobExp && user.job_id !== 'none') {
    nextJobExp[user.job_id] = (jobExp[user.job_id] ?? 0) + effect.jobExp;
  }

  const appliedGain: Partial<Abilities> = {};
  for (const [key, value] of Object.entries(gained) as Array<[keyof Abilities, number]>) {
    appliedGain[key] = value - abilities[key];
  }

  return {
    change: {
      ...change,
      user: {
        ...change.user,
        money,
        fullness,
        body_power: bodyPower,
        brain_power: brainPower,
        condition,
        weight_g: weightG,
      },
      abilities: { ...change.abilities, ...gained },
      items: { ...change.items, ...nextItems },
      jobExp: { ...change.jobExp, ...nextJobExp },
    },
    applied: {
      money: money - user.money,
      fullness: fullness - user.fullness,
      bodyPower: bodyPower - user.body_power,
      brainPower: brainPower - user.brain_power,
      condition: condition - user.condition,
      weight: (weightG - user.weight_g) / 1000,
      gain: appliedGain,
      jobExp: nextJobExp[user.job_id] !== undefined ? effect.jobExp : 0,
    },
  };
}

// ランダムイベントを抽選し、起きたら効果を重ねた変更内容とイベントの表示内容を返す
export function rollRandomEvent(
  kind: ActionKind,
  player: Player,
  change: PlayerChange,
): { change: PlayerChange; events: ActionEvent[] } {
  const merged = mergeChange(player, change);
  const ctx = change.context ?? {};
  const event = drawEvent(kind, { money: merged.user.money, jobId: merged.user.job_id, items: merged.items }, ctx);
  if (!event) return { change, events: [] };

  const effect = typeof event.effect === 'function' ? event.effect({ money: merged.user.money, jobId: merged.user.job_id, items: merged.items }, ctx) : event.effect;
  const result = applyEventEffect(player, change, effect);
  const detail = describeEventEffect(result.applied);
  const text = detail ? `${event.text}（${detail}）` : event.text;
  return { change: result.change, events: [{ text, tone: event.tone }] };
}
