import { findItem, ITEM_TYPE_LABEL } from '../../shared/master/items';
import type { InventoryItem } from '../../shared/types';
import { api } from '../api';
import { requireLogin } from '../auth';
import { postAction, renderLayout } from '../layout';

export async function renderItems(root: HTMLElement): Promise<void> {
  const me = await requireLogin();
  if (!me) return;
  const inventory = await api.get<InventoryItem[]>('/items');

  const rows = inventory
    .map(({ itemId, quantity }) => {
      const item = findItem(itemId);
      if (!item) return '';
      return `
        <tr>
          <td>${ITEM_TYPE_LABEL[item.effect.type]}</td>
          <td>${item.name}</td>
          <td>${item.description}</td>
          <td>${quantity}</td>
          <td><button type="button" data-use="${item.id}">使う</button></td>
        </tr>
      `;
    })
    .join('');

  const main = renderLayout(root, me);
  main.innerHTML = `
    <section class="box">
      <h2>所持アイテム</h2>
      <p>空腹度: ${me.hunger} / 100　コンディション: ${me.condition} / 100　身体パワー: ${me.bodyPower.current} / ${me.bodyPower.max}　頭脳パワー: ${me.brainPower.current} / ${me.brainPower.max}</p>
      ${
        inventory.length === 0
          ? '<p>アイテムを持っていません。<a href="#/facility/shop">お店</a>で買いましょう。</p>'
          : `<table class="table list">
              <thead><tr><th>種類</th><th>アイテム</th><th>効果</th><th>個数</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`
      }
      <p><a href="#/home">← 町に戻る</a></p>
    </section>
  `;
  main.querySelectorAll<HTMLButtonElement>('[data-use]').forEach((button) => {
    button.addEventListener('click', () => postAction('/items/use', { itemId: button.dataset.use }, () => renderItems(root)));
  });
}
