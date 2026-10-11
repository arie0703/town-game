import { Hono } from 'hono';
import { yen } from '../../shared/format';
import { describeEffect } from '../../shared/master/effects';
import { findItem } from '../../shared/master/items';
import { findTravel } from '../../shared/master/travels';
import type { ActionResult } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { applyEffect } from '../game/effects';
import { GameError } from '../game/errors';
import { runAction } from '../game/player';
import { chance } from '../game/random';

export const travelRoutes = new Hono<AuthEnv>();

// 旅行: 費用と身体パワーを使い、旅行先の効果を得る。お土産は確率で手に入る
travelRoutes.post('/travel', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const travel = typeof body?.travelId === 'string' ? findTravel(body.travelId) : undefined;
  if (!travel) throw new GameError('その旅行先はありません');

  const result = await runAction(
    c.get('userId'),
    (player) => {
      if (player.user.money < travel.cost) throw new GameError('お金が足りません');
      if (player.user.body_power < travel.powerCost) throw new GameError('身体パワーが足りません。休息しましょう');

      // 効果は費用・身体パワーを払った後の状態に反映する
      const user = { ...player.user, money: player.user.money - travel.cost, body_power: player.user.body_power - travel.powerCost };
      const paid = { ...player, user };
      const change = applyEffect(paid, travel.effect);
      const got = travel.souvenirs.filter((s) => chance(s.chance)).map((s) => findItem(s.itemId)!);
      const items = Object.fromEntries(got.map((item) => [item.id, (player.items[item.id] ?? 0) + 1]));
      const souvenirText = got.map((item) => `お土産に「${item.name}」を手に入れた！`).join('');
      return {
        user: { ...change.user, money: paid.user.money },
        abilities: change.abilities,
        items,
        message: `${travel.name}に行ってきた（${yen(travel.cost)}、身体パワー -${travel.powerCost}、${describeEffect(travel.effect)}）${souvenirText}`,
        context: { travelCost: travel.cost },
      };
    },
    'travel',
  );
  return c.json<ActionResult>(result);
});
