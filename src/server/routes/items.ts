import { Hono } from 'hono';
import { LIMITS, SOUP_KITCHEN } from '../../shared/config';
import { yen } from '../../shared/format';
import { isBad } from '../../shared/goodness';
import { effectForBmi } from '../../shared/bmi';
import { describeEffect } from '../../shared/master/effects';
import { findItem } from '../../shared/master/items';
import { findMenu } from '../../shared/master/menus';
import type { ActionResult, InventoryItem } from '../../shared/types';
import { requireAuth, type AuthEnv } from '../auth';
import { db } from '../db';
import { GameError } from '../game/errors';
import { applyEffect } from '../game/effects';
import { loadPlayer, runAction, type Player } from '../game/player';
import { bmi, clamp } from '../game/status';

// 体力の回復量は BMI 補正後の実際の値でメッセージに出す
const bmiOf = ({ user }: Player) => bmi(user.height, user.weight_g);

const MAX_PURCHASE_QUANTITY = 99;

async function readBody(req: Request): Promise<Record<string, unknown>> {
  return ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
}

// 食事は体力が満タンのときはできない
function assertNotFull(condition: number): void {
  if (condition >= LIMITS.conditionMax) throw new GameError('体力が満タンなので食べられません');
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
  // お土産（shop: travel）はどこでも売っていない
  if (!item || item.shop === 'travel') throw new GameError('そのアイテムは売っていません');
  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PURCHASE_QUANTITY) {
    throw new GameError(`個数は1〜${MAX_PURCHASE_QUANTITY}で指定してください`);
  }

  const result = await runAction(c.get('userId'), ({ user, items }) => {
    const blackmarket = item.shop === 'blackmarket';
    // 闇市場はワル以下しか入れない（条件はメッセージに出さない）
    if (blackmarket && !isBad(user.goodness)) throw new GameError('闇の商人に相手にされなかった');
    const total = item.price * quantity;
    if (user.money < total) throw new GameError('お金が足りません');
    return {
      user: { money: user.money - total },
      items: { [item.id]: (items[item.id] ?? 0) + quantity },
      message: `${blackmarket ? '闇市場' : 'お店'}で${item.name}を${quantity}個買った（${yen(total)}）`,
      context: { boughtItemId: item.id, boughtQuantity: quantity },
    };
  }, item.shop === 'blackmarket' ? 'blackmarket' : undefined);
  return c.json<ActionResult>(result);
});

// 所持アイテムを使う
itemRoutes.post('/items/use', requireAuth, async (c) => {
  const body = await readBody(c.req.raw);
  const item = typeof body.itemId === 'string' ? findItem(body.itemId) : undefined;
  if (!item) throw new GameError('そのアイテムはありません');

  const result = await runAction(c.get('userId'), (player) => {
    const owned = player.items[item.id] ?? 0;
    if (owned <= 0) throw new GameError(`${item.name}を持っていません`);
    if (item.effect.type === 'souvenir') throw new GameError('ここでは使えないようだ');
    if (item.effect.type === 'food') assertNotFull(player.user.condition);
    const { user, abilities } = applyEffect(player, item.effect);
    const verb = item.effect.type === 'food' ? '食べた' : '使った';
    return {
      user,
      abilities,
      items: { [item.id]: owned - 1 },
      message: `${item.name}を${verb}（${describeEffect(effectForBmi(item.effect, bmiOf(player)))}）`,
    };
  }, 'item');
  return c.json<ActionResult>(result);
});

// 食堂・居酒屋で注文する
itemRoutes.post('/eat', requireAuth, async (c) => {
  const body = await readBody(c.req.raw);
  const menu = typeof body.menuId === 'string' ? findMenu(body.menuId) : undefined;
  if (!menu) throw new GameError('そのメニューはありません');

  const result = await runAction(c.get('userId'), (player) => {
    // お酒は別腹（体力が満タンでも飲める）
    if (!menu.drink) assertNotFull(player.user.condition);
    if (player.user.money < menu.price) throw new GameError('お金が足りません');
    const change = applyEffect(player, menu.effect);
    return {
      user: { ...change.user, money: player.user.money - menu.price },
      abilities: change.abilities,
      message: `${menu.shop === 'izakaya' ? '居酒屋' : '食堂'}で${menu.name}を${menu.drink ? '飲んだ' : '食べた'}（${yen(menu.price)}、${describeEffect(effectForBmi(menu.effect, bmiOf(player)))}）`,
    };
  }, menu.shop === 'izakaya' ? 'izakaya' : 'cafeteria');
  return c.json<ActionResult>(result);
});

// 炊き出し（持ち金がちょうど 0円 のときだけ）
itemRoutes.post('/cafeteria/soup', requireAuth, async (c) => {
  const result = await runAction(c.get('userId'), ({ user, lands }) => {
    if (user.money !== 0) throw new GameError('炊き出しは一文無しの方限定です');
    if (user.deposit > 0) throw new GameError('銀行に預金がある方は炊き出しを利用できません');
    if (lands.length > 0) throw new GameError('不動産をお持ちの方は炊き出しを利用できません');
    assertNotFull(user.condition);
    return {
      user: {
        condition: clamp(user.condition + SOUP_KITCHEN.conditionRecovery, 0, LIMITS.conditionMax),
        soup_kitchen_count: user.soup_kitchen_count + 1,
      },
      message: `炊き出しの列に並んだ（おにぎり1個をもらった。通算${user.soup_kitchen_count + 1}回目）`,
    };
  });
  return c.json<ActionResult>(result);
});
