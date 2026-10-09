import { Hono } from 'hono';
import { LIMITS, SOUP_KITCHEN } from '../../shared/config';
import { yen } from '../../shared/format';
import { describeItem, findItem } from '../../shared/master/items';
import { describeMenu, findMenu } from '../../shared/master/menus';
import type { ActionResult, InventoryItem } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { GameError } from '../game/errors';
import { applyEffect } from '../game/effects';
import { loadPlayer, runAction } from '../game/player';
import { clamp } from '../game/status';

const MAX_PURCHASE_QUANTITY = 99;

async function readBody(req: Request): Promise<Record<string, unknown>> {
  return ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
}

function assertNotFull(fullness: number): void {
  if (fullness >= LIMITS.fullnessMax) throw new GameError('お腹いっぱいで食べられません');
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

  const message = await runAction(c.get('userId'), (player) => {
    const owned = player.items[item.id] ?? 0;
    if (owned <= 0) throw new GameError(`${item.name}を持っていません`);
    if (item.effect.type === 'food') assertNotFull(player.user.fullness);
    const { user, abilities } = applyEffect(player, item.effect);
    const verb = item.effect.type === 'food' ? '食べた' : '使った';
    return {
      user,
      abilities,
      items: { [item.id]: owned - 1 },
      message: `${item.name}を${verb}（${describeItem(item)}）`,
    };
  });
  return c.json<ActionResult>({ message });
});

// 食堂・居酒屋で注文する
itemRoutes.post('/eat', requireAuth, async (c) => {
  const body = await readBody(c.req.raw);
  const menu = typeof body.menuId === 'string' ? findMenu(body.menuId) : undefined;
  if (!menu) throw new GameError('そのメニューはありません');

  const message = await runAction(c.get('userId'), (player) => {
    // お酒は別腹（満腹でも飲める）
    if (!menu.drink) assertNotFull(player.user.fullness);
    if (player.user.money < menu.price) throw new GameError('お金が足りません');
    const change = applyEffect(player, menu.effect);
    return {
      user: { ...change.user, money: player.user.money - menu.price },
      abilities: change.abilities,
      message: `${menu.shop === 'izakaya' ? '居酒屋' : '食堂'}で${menu.name}を${menu.drink ? '飲んだ' : '食べた'}（${yen(menu.price)}、${describeMenu(menu)}）`,
    };
  });
  return c.json<ActionResult>({ message });
});

// 炊き出し（持ち金がちょうど 0円 のときだけ）
itemRoutes.post('/cafeteria/soup', requireAuth, async (c) => {
  const message = await runAction(c.get('userId'), ({ user }) => {
    if (user.money !== 0) throw new GameError('炊き出しは一文無しの方限定です');
    if (user.deposit > 0) throw new GameError('銀行に預金がある方は炊き出しを利用できません');
    assertNotFull(user.fullness);
    return {
      user: {
        fullness: clamp(user.fullness + SOUP_KITCHEN.fullnessRecovery, 0, LIMITS.fullnessMax),
        soup_kitchen_count: user.soup_kitchen_count + 1,
      },
      message: `炊き出しの列に並んだ（おにぎり1個をもらった。通算${user.soup_kitchen_count + 1}回目）`,
    };
  });
  return c.json<ActionResult>({ message });
});
