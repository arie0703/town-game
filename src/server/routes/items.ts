import { Hono } from 'hono';
import { LIMITS, SOUP_KITCHEN } from '../../shared/config';
import { yen } from '../../shared/format';
import { findItem } from '../../shared/master/items';
import { findMenu } from '../../shared/master/menus';
import type { ActionResult, InventoryItem } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { GameError } from '../game/errors';
import { addAbilities, loadPlayer, runAction } from '../game/player';
import { bmi, clamp, conditionRecovery, maxPowers } from '../game/status';

const MAX_PURCHASE_QUANTITY = 99;

async function readBody(req: Request): Promise<Record<string, unknown>> {
  return ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
}

function assertNotFull(hunger: number): void {
  if (hunger >= LIMITS.hungerMax) throw new GameError('お腹いっぱいで食べられません');
}

export const itemRoutes = new Hono<AuthEnv>();

// 所持アイテム一覧
itemRoutes.get('/items', requireAuth, async (c) => {
  const { items } = await loadPlayer(db, c.get('userId'));
  const list: InventoryItem[] = Object.entries(items).map(([itemId, quantity]) => ({ itemId, quantity }));
  return c.json(list);
});

// お店でアイテムを買う
itemRoutes.post('/shop/buy', requireAuth, async (c) => {
  const body = await readBody(c.req.raw);
  const item = typeof body.itemId === 'string' ? findItem(body.itemId) : undefined;
  if (!item) throw new GameError('そのアイテムは売っていません');
  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PURCHASE_QUANTITY) {
    throw new GameError(`個数は1〜${MAX_PURCHASE_QUANTITY}で指定してください`);
  }

  const message = await runAction(c.get('userId'), ({ user, items }) => {
    const total = item.price * quantity;
    if (user.money < total) throw new GameError('お金が足りません');
    return {
      user: { money: user.money - total },
      items: { [item.id]: (items[item.id] ?? 0) + quantity },
      message: `お店で${item.name}を${quantity}個買った（${yen(total)}）`,
    };
  });
  return c.json<ActionResult>({ message });
});

// 所持アイテムを使う
itemRoutes.post('/items/use', requireAuth, async (c) => {
  const body = await readBody(c.req.raw);
  const item = typeof body.itemId === 'string' ? findItem(body.itemId) : undefined;
  if (!item) throw new GameError('そのアイテムはありません');

  const message = await runAction(c.get('userId'), ({ user, abilities, items }) => {
    const owned = items[item.id] ?? 0;
    if (owned <= 0) throw new GameError(`${item.name}を持っていません`);
    const consumed = { [item.id]: owned - 1 };
    const effect = item.effect;

    switch (effect.type) {
      case 'food':
        assertNotFull(user.hunger);
        return {
          user: {
            hunger: clamp(user.hunger + effect.hunger, 0, LIMITS.hungerMax),
            weight: user.weight + effect.weight,
          },
          items: consumed,
          message: `${item.name}を食べた`,
        };
      case 'ability':
        return { abilities: addAbilities(abilities, effect.gain), items: consumed, message: `${item.name}を使った（${item.description}）` };
      case 'recovery': {
        const max = maxPowers(abilities);
        const condition = conditionRecovery(effect.condition ?? 0, bmi(user.height, user.weight));
        return {
          user: {
            body_power: Math.min(max.body, user.body_power + (effect.bodyPower ?? 0)),
            brain_power: Math.min(max.brain, user.brain_power + (effect.brainPower ?? 0)),
            condition: clamp(user.condition + condition, 0, LIMITS.conditionMax),
          },
          items: consumed,
          message: `${item.name}を使った`,
        };
      }
    }
  });
  return c.json<ActionResult>({ message });
});

// 食堂で食事する
itemRoutes.post('/cafeteria/eat', requireAuth, async (c) => {
  const body = await readBody(c.req.raw);
  const menu = typeof body.menuId === 'string' ? findMenu(body.menuId) : undefined;
  if (!menu) throw new GameError('そのメニューはありません');

  const message = await runAction(c.get('userId'), ({ user }) => {
    assertNotFull(user.hunger);
    if (user.money < menu.price) throw new GameError('お金が足りません');
    return {
      user: {
        money: user.money - menu.price,
        hunger: clamp(user.hunger + menu.hunger, 0, LIMITS.hungerMax),
        weight: user.weight + menu.weight,
      },
      message: `食堂で${menu.name}を食べた（${yen(menu.price)}）`,
    };
  });
  return c.json<ActionResult>({ message });
});

// 炊き出し（持ち金がちょうど 0円 のときだけ）
itemRoutes.post('/cafeteria/soup', requireAuth, async (c) => {
  const message = await runAction(c.get('userId'), ({ user }) => {
    if (user.money !== 0) throw new GameError('炊き出しは一文無しの方限定です');
    assertNotFull(user.hunger);
    return {
      user: {
        hunger: clamp(user.hunger + SOUP_KITCHEN.hungerRecovery, 0, LIMITS.hungerMax),
        soup_kitchen_count: user.soup_kitchen_count + 1,
      },
      message: `炊き出しの列に並んだ（おにぎり1個をもらった。通算${user.soup_kitchen_count + 1}回目）`,
    };
  });
  return c.json<ActionResult>({ message });
});
