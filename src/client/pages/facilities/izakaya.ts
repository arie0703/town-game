import { menusOf } from '../../../shared/master/menus';
import type { Me } from '../../../shared/types';
import { bindMenuButtons, menuTableHtml } from '../../components/menu-table';
import { yen } from '../../format';

export async function renderIzakaya(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const menus = menusOf('izakaya');
  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}　満腹度: ${me.fullness} / 100　コンディション: ${me.condition} / 100</p>
    <p class="note">お酒は別腹（満腹でも飲める）。ただしコンディションは下がり、体重は増える。</p>
    ${menuTableHtml(menus.filter((m) => m.drink), 'お酒')}
    ${menuTableHtml(menus.filter((m) => !m.drink), '料理')}
  `;
  bindMenuButtons(container, rerender);
}
