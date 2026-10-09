import { CHEAPEST_MENU_PRICE, menusOf } from '../../../shared/master/menus';
import { SOUP_REFUSAL_LINE } from '../../../shared/master/npcs';
import type { Me } from '../../../shared/types';
import { bindMenuButtons, menuTableHtml } from '../../components/menu-table';
import { npcHtml } from '../../components/npc';
import { yen } from '../../format';
import { postAction } from '../../layout';

function soupKitchenHtml(me: Me): string {
  if (me.money === 0) {
    return `
      <div class="box soup">
        <h3>炊き出し</h3>
        ${npcHtml('npc_soup')}
        <button type="button" id="soup">炊き出しの列に並ぶ</button>
      </div>
    `;
  }
  if (me.money < CHEAPEST_MENU_PRICE) {
    return `
      <div class="box soup">
        <h3>炊き出し</h3>
        ${npcHtml('npc_soup', SOUP_REFUSAL_LINE)}
        <p class="note">小銭しかないなら……<a href="#/facility/casino">賭場</a>で一か八か勝負してみては？</p>
      </div>
    `;
  }
  return '';
}

export async function renderCafeteria(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}　満腹度: ${me.fullness} / 100</p>
    ${menuTableHtml(menusOf('cafeteria'), 'メニュー')}
    ${soupKitchenHtml(me)}
  `;
  bindMenuButtons(container, rerender);
  container.querySelector('#soup')?.addEventListener('click', () => postAction('/cafeteria/soup', {}, rerender));
}
