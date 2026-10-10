import { Hono } from 'hono';
import { CHOHAN, FIGHT, LIMITS } from '../../shared/config';
import { yen } from '../../shared/format';
import type { ActionResult } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { GameError } from '../game/errors';
import { combatPower, winRate } from '../game/fight';
import { loadPlayer, runAction } from '../game/player';
import { chance, pickRandom, randomIntInclusive } from '../game/random';
import { afterAction, clamp } from '../game/status';

export const battleRoutes = new Hono<AuthEnv>();

// 丁半: サイコロ2個の合計が偶数なら丁、奇数なら半
battleRoutes.post('/casino/chohan', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const bet = Number(body?.bet);
  const guess = body?.guess;
  if (guess !== 'cho' && guess !== 'han') throw new GameError('丁か半を選んでください');
  if (!Number.isInteger(bet) || bet < 1) throw new GameError('賭け金は1円以上の整数で指定してください');
  if (bet > CHOHAN.maxBet) throw new GameError(`賭け金は1回${yen(CHOHAN.maxBet)}までです`);

  const result = await runAction(c.get('userId'), ({ user }) => {
    if (bet > user.money) throw new GameError('持ち金が足りません');
    const dice = [randomIntInclusive(1, 6), randomIntInclusive(1, 6)];
    const result = (dice[0] + dice[1]) % 2 === 0 ? 'cho' : 'han';
    const won = result === guess;
    const label = result === 'cho' ? '丁' : '半';
    const head = `丁半で${yen(bet)}を賭けた。出目は ${dice[0]}・${dice[1]} の${label}！`;
    return {
      user: { money: won ? user.money + bet : user.money - bet },
      message: won ? `${head}当たり！${yen(bet * 2)}を受け取った` : `${head}外れ…${yen(bet)}を失った`,
    };
  });
  return c.json<ActionResult>(result);
});

// ストリートファイト: 相手はランダム。勝敗の影響を受けるのは挑戦した側のみ
battleRoutes.post('/fight', requireAuth, async (c) => {
  const userId = c.get('userId');
  const others = await db.selectFrom('users').select('id').where('id', '!=', userId).execute();
  if (others.length === 0) throw new GameError('町に他の住民がいません');
  // 相手のデータは読み取りのみ（書き換えない）
  const opponent = await loadPlayer(db, pickRandom(others).id);

  const result = await runAction(userId, ({ user, abilities }) => {
    if (user.body_power < FIGHT.powerCost) throw new GameError('身体パワーが足りません。休息しましょう');

    const mine = combatPower(abilities, user.condition);
    const theirs = combatPower(opponent.abilities, opponent.user.condition);
    const rate = winRate(mine, theirs);
    const won = chance(rate);
    const after = afterAction(user, FIGHT.fullnessCost);
    const head = `${opponent.user.name}さんにストリートファイトを挑んだ（戦闘力 ${mine} vs ${theirs}、勝率 ${Math.round(rate * 100)}%）。`;
    const base = { body_power: user.body_power - FIGHT.powerCost, fullness: after.fullness };

    if (won) {
      const prize = theirs * FIGHT.prizePerPower;
      return {
        user: { ...base, money: user.money + prize, condition: after.condition },
        message: `${head}勝利！賞金${yen(prize)}を手に入れた`,
      };
    }
    const lost = user.money - Math.floor(user.money / 2);
    return {
      user: {
        ...base,
        money: user.money - lost,
        condition: clamp(after.condition - FIGHT.loseConditionDamage, 0, LIMITS.conditionMax),
      },
      message: `${head}敗北…持ち金が半分になった（-${yen(lost)}）`,
    };
  }, 'fight');
  return c.json<ActionResult>(result);
});
