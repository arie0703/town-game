import { Hono } from 'hono';
import { LIMITS } from '../../shared/config';
import { yen } from '../../shared/format';
import { clampGoodness } from '../../shared/goodness';
import { GANG, GANG_RANKS, gangPromotionChecks } from '../../shared/master/gang';
import type { ActionResult } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { GameError } from '../game/errors';
import { runAction, stateOf, type Player } from '../game/player';
import { chance, randomFloat } from '../game/random';
import { afterAction, clamp } from '../game/status';

export const hideoutRoutes = new Hono<AuthEnv>();

function memberOf(player: Player) {
  const gang = stateOf(player, 'gang');
  if (!gang) throw new GameError('組の人間じゃねえだろ');
  return gang;
}

// 所属する（条件は伏せる。満たさなければ門前払い）
hideoutRoutes.post('/hideout/join', requireAuth, async (c) => {
  const result = await runAction(c.get('userId'), (player) => {
    if (stateOf(player, 'gang')) throw new GameError('もう組の人間だろ');
    const { user } = player;
    if (user.goodness > GANG.joinGoodnessMax || GANG.bannedJobs.includes(user.job_id)) {
      throw new GameError('門を叩いたが、相手にされなかった');
    }
    return {
      states: { set: [{ id: 'gang', level: 0 }] },
      message: `裏組織の盃を受けた（${GANG_RANKS[0].name}になった）`,
    };
  });
  return c.json<ActionResult>(result);
});

// 昇進（上納金を納め、条件を満たしていれば次の階級へ。仮の仕組み）
hideoutRoutes.post('/hideout/promote', requireAuth, async (c) => {
  const result = await runAction(c.get('userId'), (player) => {
    const gang = memberOf(player);
    const next = GANG_RANKS[gang.level + 1];
    if (!next?.promotion) throw new GameError('これ以上の出世はない');
    const { promotion } = next;
    const unmet = gangPromotionChecks(promotion, { money: player.user.money, abilities: player.abilities, items: player.items })
      .filter((check) => !check.met)
      .map((check) => check.label);
    if (unmet.length > 0) throw new GameError(`まだ早い（${unmet.join('、')}）`);
    return {
      user: { money: player.user.money - promotion.tribute },
      items: promotion.itemId ? { [promotion.itemId]: (player.items[promotion.itemId] ?? 0) - 1 } : undefined,
      states: { set: [{ id: 'gang', level: gang.level + 1 }] },
      message: `上納金${yen(promotion.tribute)}を納め、${next.name}に昇進した`,
    };
  });
  return c.json<ActionResult>(result);
});

// シノギ: 身体パワー・満腹度を使って稼ぐ。抗争・摘発のリスクがある
hideoutRoutes.post('/hideout/shinogi', requireAuth, async (c) => {
  const result = await runAction(
    c.get('userId'),
    (player) => {
      const gang = memberOf(player);
      const { user } = player;
      const s = GANG.shinogi;
      if (user.body_power < s.powerCost) throw new GameError('身体パワーが足りません。休息しましょう');

      const after = afterAction(user, s.fullnessCost);
      const base = { body_power: user.body_power - s.powerCost, fullness: after.fullness };
      // 警察の摘発: 罰金を払い、組を抜けさせられる
      if (chance(s.raid.chance)) {
        const fine = Math.floor(user.money * s.raid.fineRate);
        return {
          user: { ...base, condition: after.condition, money: user.money - fine },
          states: { remove: ['gang'] },
          message: `シノギの最中に警察の摘発を受けた。罰金${yen(fine)}を払い、組を抜けることになった`,
        };
      }
      const [min, max] = s.rateRange;
      const pay = Math.floor(GANG_RANKS[gang.level].shinogiBase * (min + randomFloat() * (max - min)));
      const feud = chance(s.feud.chance);
      return {
        user: {
          ...base,
          money: user.money + pay,
          condition: clamp(after.condition + (feud ? s.feud.condition : 0), 0, LIMITS.conditionMax),
          goodness: clampGoodness(user.goodness + s.goodness),
        },
        message: `シノギで${yen(pay)}を稼いだ（善悪 ${s.goodness}）${feud ? `。抗争に巻き込まれた（コンディション ${s.feud.condition}）` : ''}`,
      };
    },
    'shinogi',
  );
  return c.json<ActionResult>(result);
});

// 足を洗う（足抜け料を払って脱退）
hideoutRoutes.post('/hideout/leave', requireAuth, async (c) => {
  const result = await runAction(c.get('userId'), (player) => {
    memberOf(player);
    if (player.user.money < GANG.leaveFee) throw new GameError(`足抜け料${yen(GANG.leaveFee)}が払えねえなら、抜けさせるわけにはいかねえ`);
    return {
      user: { money: player.user.money - GANG.leaveFee },
      states: { remove: ['gang'] },
      message: `足抜け料${yen(GANG.leaveFee)}を払い、足を洗った`,
    };
  });
  return c.json<ActionResult>(result);
});
