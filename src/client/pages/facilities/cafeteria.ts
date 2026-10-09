import { CHEAPEST_MENU_PRICE, describeMenu, MENUS } from '../../../shared/master/menus';
import type { Me } from '../../../shared/types';
import { yen } from '../../format';
import { postAction } from '../../layout';

function soupKitchenHtml(me: Me): string {
  if (me.money === 0) {
    return `
      <div class="box soup">
        <h3>炊き出し</h3>
        <p>一文無しのあなたに、おにぎりを1個どうぞ。</p>
        <button type="button" id="soup">炊き出しの列に並ぶ</button>
      </div>
    `;
  }
  if (me.money < CHEAPEST_MENU_PRICE) {
    return `
      <div class="box soup">
        <h3>炊き出し</h3>
        <p>炊き出しは一文無しの方限定です。</p>
        <p class="note">小銭しかないなら……<a href="#/facility/casino">賭場</a>で一か八か勝負してみては？</p>
      </div>
    `;
  }
  return '';
}

export async function renderCafeteria(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const rows = MENUS.map(
    (menu) => `
      <tr>
        <td>${menu.name}</td>
        <td>${describeMenu(menu)}</td>
        <td>${yen(menu.price)}</td>
        <td><button type="button" data-menu="${menu.id}">食べる</button></td>
      </tr>
    `,
  ).join('');

  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}　満腹度: ${me.fullness} / 100</p>
    <table class="table list">
      <thead><tr><th>メニュー</th><th>効果</th><th>価格</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${soupKitchenHtml(me)}
  `;
  container.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach((button) => {
    button.addEventListener('click', () => postAction('/cafeteria/eat', { menuId: button.dataset.menu }, rerender));
  });
  container.querySelector('#soup')?.addEventListener('click', () => postAction('/cafeteria/soup', {}, rerender));
}
