import { Hono } from 'hono';
import { yen } from '../../shared/format';
import type { ActionResult } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { GameError } from '../game/errors';
import { runAction } from '../game/player';

async function readAmount(req: Request): Promise<number> {
  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isInteger(amount) || amount < 1) throw new GameError('金額は1円以上の整数で指定してください');
  return amount;
}

export const bankRoutes = new Hono<AuthEnv>();

// 預け入れ
bankRoutes.post('/bank/deposit', requireAuth, async (c) => {
  const amount = await readAmount(c.req.raw);
  const message = await runAction(c.get('userId'), ({ user }) => {
    if (amount > user.money) throw new GameError('持ち金が足りません');
    return {
      user: { money: user.money - amount, deposit: user.deposit + amount },
      message: `銀行に${yen(amount)}を預けた（預金残高 ${yen(user.deposit + amount)}）`,
    };
  });
  return c.json<ActionResult>({ message });
});

// 引き出し
bankRoutes.post('/bank/withdraw', requireAuth, async (c) => {
  const amount = await readAmount(c.req.raw);
  const message = await runAction(c.get('userId'), ({ user }) => {
    if (amount > user.deposit) throw new GameError('預金残高が足りません');
    return {
      user: { money: user.money + amount, deposit: user.deposit - amount },
      message: `銀行から${yen(amount)}を引き出した（預金残高 ${yen(user.deposit - amount)}）`,
    };
  });
  return c.json<ActionResult>({ message });
});
