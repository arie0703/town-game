import { ITEM_TYPE_LABEL, itemsOf, type Item } from '../../../shared/master/items';
import { abilityEffectHtml, conditionEffectHtml } from '../../components/effect';
import type { InventoryItem, Me } from '../../../shared/types';
import { api } from '../../api';
import { yen } from '../../format';
import { postAction } from '../../layout';

async function renderItemShop(
  container: HTMLElement,
  me: Me,
  rerender: () => Promise<void>,
  shop: Item['shop'],
): Promise<void> {
  const inventory = await api.get<InventoryItem[]>('/items');
  const owned = (itemId: string) => inventory.find((i) => i.itemId === itemId)?.quantity ?? 0;

  const rows = itemsOf(shop).map(
    (item) => `
      <tr>
        <td>${ITEM_TYPE_LABEL[item.effect.type]}</td>
        <td>${item.name}</td>
        <td>${conditionEffectHtml(item.effect)}</td>
        <td>${abilityEffectHtml(item.effect)}</td>
        <td>${yen(item.price)}</td>
        <td>${owned(item.id)}</td>
        <td class="nowrap">
          <input type="number" class="quantity" min="1" max="99" value="1" data-quantity="${item.id}" />
          <button type="button" data-buy="${item.id}">買う</button>
        </td>
      </tr>
    `,
  ).join('');

  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}　<a href="#/items">所持アイテムを見る</a></p>
    <table class="table list">
      <thead><tr><th>種類</th><th>商品</th><th>体調</th><th>能力</th><th>価格</th><th>所持</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  container.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((button) => {
    const itemId = button.dataset.buy!;
    const input = container.querySelector<HTMLInputElement>(`[data-quantity="${itemId}"]`)!;
    button.addEventListener('click', () => postAction('/shop/buy', { itemId, quantity: Number(input.value) }, rerender));
  });
}

export async function renderShop(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  await renderItemShop(container, me, rerender, 'shop');
}

export async function renderBlackmarket(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  await renderItemShop(container, me, rerender, 'blackmarket');
}
