import { Hono } from 'hono';
import { LIMITS } from '../../shared/config';
import { effectForBmi } from '../../shared/bmi';
import { yen } from '../../shared/format';
import { describeEffect } from '../../shared/master/effects';
import { findItem } from '../../shared/master/items';
import {
  AFFINITY_MAX,
  AFFINITY_STAGES,
  affinityStage,
  FAVORITE_STAGE,
  findMama,
  MAMAS,
  SNACK_ACTIONS,
  successRate,
  type Mama,
  type SnackActionId,
} from '../../shared/master/snack';
import type { ActionEvent, ActionResult, SnackMamaView } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { applyEffect } from '../game/effects';
import { GameError } from '../game/errors';
import { addAbilities, loadPlayer, runAction, type Player, type PlayerChange } from '../game/player';
import { chance, pickRandom } from '../game/random';
import { bmi, spendCondition } from '../game/status';

export const snackRoutes = new Hono<AuthEnv>();

// 会えるママ（requiresState の状態がない住民には、そのママは存在しないものとして扱う）
function visibleMamas(player: Player): Mama[] {
  return MAMAS.filter((m) => !m.requiresState || player.states.some((s) => s.id === m.requiresState));
}

function mamaOf(player: Player, mamaId: unknown): Mama {
  const mama = typeof mamaId === 'string' ? findMama(mamaId) : undefined;
  if (!mama || !visibleMamas(player).includes(mama)) throw new GameError('そのママはいません');
  return mama;
}

function affinityOf(player: Player, mama: Mama) {
  return player.affinities[mama.id] ?? { value: 0, rewardedStage: 0 };
}

// 友好度を base だけ動かした変更内容と、段階が上がったときの知らせを返す
//   上がるときは、段階が上がるほど鈍くなり、ママの好み（客の善悪）でも補正する。下がるときは補正しない
function changeAffinity(player: Player, mama: Mama, base: number): Pick<PlayerChange, 'affinities' | 'items' | 'events'> {
  const current = affinityOf(player, mama);
  const stage = affinityStage(current.value);
  const delta =
    base > 0
      ? Math.max(1, Math.round(base * AFFINITY_STAGES[stage].gainRate * mama.gainRate({ goodness: player.user.goodness })))
      : base;
  const value = Math.min(AFFINITY_MAX, Math.max(0, current.value + delta));
  const nextStage = affinityStage(value);
  const events: ActionEvent[] = [];
  let items: Record<string, number> | undefined;
  let rewardedStage = current.rewardedStage;
  if (nextStage > current.rewardedStage) {
    events.push({ text: `${mama.name}との仲が『${AFFINITY_STAGES[nextStage].name}』になった！`, tone: 'good' });
    // お気に入りになったら、1回だけプレゼントをもらえる
    if (current.rewardedStage < FAVORITE_STAGE && nextStage >= FAVORITE_STAGE) {
      const present = findItem(mama.presentItemId)!;
      items = { [present.id]: (player.items[present.id] ?? 0) + 1 };
      events.push({ text: `${mama.name}から「${present.name}」をもらった`, tone: 'good' });
    }
    rewardedStage = nextStage;
  }
  return { affinities: { [mama.id]: { value, rewardedStage } }, items, events };
}

// ママの一覧（友好度は段階名と進み具合だけを返す。数値は出さない）
snackRoutes.get('/snack', requireAuth, async (c) => {
  const player = await loadPlayer(db, c.get('userId'));
  const mamas: SnackMamaView[] = visibleMamas(player).map((mama) => {
    const { value } = affinityOf(player, mama);
    const stage = affinityStage(value);
    return { id: mama.id, stage, stageName: AFFINITY_STAGES[stage].name, progress: value / AFFINITY_MAX };
  });
  return c.json(mamas);
});

// 飲食の注文
snackRoutes.post('/snack/order', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await runAction(
    c.get('userId'),
    (player) => {
      const mama = mamaOf(player, body?.mamaId);
      const menu = mama.menus.find((m) => m.id === body?.menuId);
      if (!menu) throw new GameError('そのメニューはありません');
      if (menu.requiresStage !== undefined && affinityStage(affinityOf(player, mama).value) < menu.requiresStage) {
        throw new GameError('そのメニューはありません');
      }
      if (player.user.money < menu.price) throw new GameError('お金が足りません');
      if (!menu.drink && player.user.condition >= LIMITS.conditionMax) throw new GameError('体力が満タンなので食べられません');

      const change = applyEffect(player, menu.effect);
      const affinity = changeAffinity(player, mama, menu.id === mama.favoriteMenuId ? 3 : 1);
      const effectText = describeEffect(effectForBmi(menu.effect, bmi(player.user.height, player.user.weight_g)));
      return {
        user: { ...change.user, money: player.user.money - menu.price },
        abilities: change.abilities,
        affinities: affinity.affinities,
        items: affinity.items,
        events: affinity.events,
        message: `スナックで${menu.name}を${menu.drink ? '飲んだ' : '食べた'}（${yen(menu.price)}、${effectText}）`,
        context: { mamaId: mama.id },
      };
    },
    'snack',
  );
  return c.json<ActionResult>(result);
});

// アクション（ボトルキープ・カラオケ・話す・煽てる）
snackRoutes.post('/snack/action', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const actionId = body?.action as SnackActionId;
  if (!Object.hasOwn(SNACK_ACTIONS, actionId)) throw new GameError('そのアクションはありません');

  const result = await runAction(
    c.get('userId'),
    (player): PlayerChange => {
      const mama = mamaOf(player, body?.mamaId);
      const { user, abilities } = player;
      const likes = mama.likes({ abilities, goodness: user.goodness });
      const base = { context: { mamaId: mama.id } };

      if (actionId === 'bottle') {
        const a = SNACK_ACTIONS.bottle;
        if (user.money < a.fee) throw new GameError('お金が足りません');
        const affinity = changeAffinity(player, mama, mama.bottleAffinity);
        return {
          ...base,
          user: { money: user.money - a.fee },
          affinities: affinity.affinities,
          items: affinity.items,
          events: affinity.events,
          message: `${mama.name}の店にボトルをキープした（${yen(a.fee)}）。${mama.name}が喜んだ`,
        };
      }

      const a = SNACK_ACTIONS[actionId];
      if (user.money < a.fee) throw new GameError('お金が足りません');
      if (user.brain_power < a.brainPower) throw new GameError('頭脳パワーが足りません。休息しましょう');
      const paid = { money: user.money - a.fee, brain_power: user.brain_power - a.brainPower };

      if (actionId === 'karaoke') {
        const k = SNACK_ACTIONS.karaoke;
        if (chance(successRate(k.chance, abilities))) {
          const affinity = changeAffinity(player, mama, k.success.affinity + mama.karaokeBonus);
          return {
            ...base,
            user: paid,
            abilities: addAbilities(abilities, k.success.gain),
            affinities: affinity.affinities,
            items: affinity.items,
            events: affinity.events,
            message: `カラオケで熱唱した。${mama.name}が拍手してくれた（感性 +${k.success.gain.music}）`,
          };
        }
        const affinity = changeAffinity(player, mama, k.failure.affinity);
        return {
          ...base,
          user: { ...paid, condition: spendCondition(user.condition, -k.failure.condition) },
          affinities: affinity.affinities,
          message: `カラオケで盛大に音を外した。${mama.name}が苦笑いした（体力 ${k.failure.condition}）`,
        };
      }

      const bonus = likes ? mama.talkBonus : 0;
      if (actionId === 'talk') {
        const t = SNACK_ACTIONS.talk;
        if (chance(successRate(t.chance, abilities, bonus))) {
          const affinity = changeAffinity(player, mama, t.success.affinity);
          const stage = affinityStage(affinityOf(player, mama).value);
          const hint = pickRandom(mama.hints[stage]);
          return {
            ...base,
            user: paid,
            affinities: affinity.affinities,
            items: affinity.items,
            events: affinity.events,
            message: `${mama.name}と話が弾んだ。「${hint}」`,
          };
        }
        return { ...base, user: paid, message: `${mama.name}との話がいまいち盛り上がらなかった` };
      }

      const f = SNACK_ACTIONS.flatter;
      if (chance(successRate(f.chance, abilities, bonus))) {
        const affinity = changeAffinity(player, mama, f.success.affinity);
        return {
          ...base,
          user: paid,
          affinities: affinity.affinities,
          items: affinity.items,
          events: affinity.events,
          message: `${mama.name}を褒めちぎった。まんざらでもないようだ`,
        };
      }
      const affinity = changeAffinity(player, mama, f.failure.affinity);
      return {
        ...base,
        user: paid,
        affinities: affinity.affinities,
        message: `${mama.name}に見え透いたお世辞だと見抜かれ、機嫌を損ねた`,
      };
    },
    'snack',
  );
  return c.json<ActionResult>(result);
});
