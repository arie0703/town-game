import { Hono } from 'hono';
import { yen } from '../../shared/format';
import { clampGoodness, GOODNESS } from '../../shared/goodness';
import type { ActionResult } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { GameError } from '../game/errors';
import { runAction } from '../game/player';

export const townhallRoutes = new Hono<AuthEnv>();

// 寄付（1,000円単位。1,000円ごとに善悪 +1）
townhallRoutes.post('/townhall/donate', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isInteger(amount) || amount < GOODNESS.donationUnit || amount % GOODNESS.donationUnit !== 0) {
    throw new GameError(`寄付は${yen(GOODNESS.donationUnit)}単位で指定してください`);
  }
  const result = await runAction(c.get('userId'), ({ user }) => {
    if (user.goodness >= GOODNESS.max) throw new GameError('これ以上の善行は積めないほど、あなたは善人です');
    if (amount > user.money) throw new GameError('持ち金が足りません');
    const goodness = clampGoodness(user.goodness + amount / GOODNESS.donationUnit);
    return {
      user: { money: user.money - amount, goodness },
      message: `役場に${yen(amount)}を寄付した（善悪 +${goodness - user.goodness}）`,
    };
  });
  return c.json<ActionResult>(result);
});

// ボランティア（身体パワー・満腹度を使って善悪 +3）
townhallRoutes.post('/townhall/volunteer', requireAuth, async (c) => {
  const result = await runAction(c.get('userId'), ({ user }) => {
    if (user.goodness >= GOODNESS.max) throw new GameError('これ以上の善行は積めないほど、あなたは善人です');
    if (user.body_power < GOODNESS.volunteerPowerCost) throw new GameError('身体パワーが足りません。休息しましょう');
    if (user.fullness <= 0) throw new GameError('お腹が空きすぎて動けません。何か食べましょう');
    const goodness = clampGoodness(user.goodness + GOODNESS.volunteerGain);
    return {
      user: {
        body_power: user.body_power - GOODNESS.volunteerPowerCost,
        fullness: Math.max(0, user.fullness - GOODNESS.volunteerFullnessCost),
        goodness,
      },
      message: `町のゴミ拾いのボランティアをした（善悪 +${goodness - user.goodness}）`,
    };
  });
  return c.json<ActionResult>(result);
});
