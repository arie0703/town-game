import type { Menu } from '../../shared/master/menus';
import { effectForBmi } from '../../shared/bmi';
import { abilityEffectHtml, conditionEffectHtml } from './effect';
import { yen } from '../format';
import { postAction } from '../layout';

// 食堂・居酒屋のメニュー表
// bmi: 体力の回復量は BMI 補正後の実際の値で表示する
export function menuTableHtml(menus: Menu[], caption: string, bmi: number): string {
  const rows = menus
    .map(
      (menu) => `
        <tr>
          <td>${menu.name}</td>
          <td>${conditionEffectHtml(effectForBmi(menu.effect, bmi))}</td>
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

// redirect: 注文に成功したら移る画面（食堂は1回で体力が大きく回復するので、町の地図へ戻す）
export function bindMenuButtons(container: HTMLElement, rerender: () => Promise<void>, redirect?: string): void {
  container.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach((button) => {
    button.addEventListener('click', () => postAction('/eat', { menuId: button.dataset.menu }, rerender, { redirect }));
  });

}
