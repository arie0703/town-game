import { menusOf } from '../../../shared/master/menus';
import type { Me } from '../../../shared/types';
import { bindMenuButtons, menuTableHtml } from '../../components/menu-table';
import { yen } from '../../format';

export async function renderIzakaya(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const menus = menusOf('izakaya');
  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}　体力: ${me.condition} / 100</p>
    <p class="note">お酒は別腹（体力が満タンでも飲める）。ただし体力は下がり、体重は増える。</p>
    ${menuTableHtml(menus.filter((m) => m.drink), 'お酒', me.bmi)}
    ${menuTableHtml(menus.filter((m) => !m.drink), '料理', me.bmi)}
  `;
  bindMenuButtons(container, rerender);
}
