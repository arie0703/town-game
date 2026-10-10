import type { Menu } from '../../shared/master/menus';
import { abilityEffectHtml, conditionEffectHtml } from './effect';
import { yen } from '../format';
import { postAction } from '../layout';

// 食堂・居酒屋のメニュー表
export function menuTableHtml(menus: Menu[], caption: string): string {
  const rows = menus
    .map(
      (menu) => `
        <tr>
          <td>${menu.name}</td>
          <td>${conditionEffectHtml(menu.effect)}</td>
          <td>${abilityEffectHtml(menu.effect)}</td>
          <td class="nowrap">${yen(menu.price)}</td>
          <td class="nowrap"><button type="button" data-menu="${menu.id}">${menu.drink ? '飲む' : '食べる'}</button></td>
        </tr>
      `,
    )
    .join('');
  return `
    <table class="table list">
      <caption>${caption}</caption>
      <thead><tr><th>メニュー</th><th>体調</th><th>能力</th><th>価格</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function bindMenuButtons(container: HTMLElement, rerender: () => Promise<void>): void {
  container.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach((button) => {
    button.addEventListener('click', () => postAction('/eat', { menuId: button.dataset.menu }, rerender));
  });
}
