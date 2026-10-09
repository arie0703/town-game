import type { MapCellView, Me } from '../../../shared/types';
import { api } from '../../api';
import { mapHtml } from '../../components/map';
import { yen } from '../../format';
import { postAction } from '../../layout';

export async function renderRealestate(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const cells = await api.get<MapCellView[]>('/map');
  const myLands = cells.filter((c) => c.type === 'lot' && c.owner?.id === me.id);
  const myLandValue = myLands.reduce((sum, c) => sum + (c.type === 'lot' ? c.landPrice : 0), 0);

  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}　所有地: ${myLands.length}区画（評価額 ${yen(myLandValue)}）</p>
    <p class="note">緑の空き地をクリックすると購入できます（町の中心ほど高い）。購入した土地は売却できません。</p>
    ${mapHtml(cells, { myId: me.id, buyable: true })}
  `;
  container.querySelectorAll<HTMLButtonElement>('[data-buy-cell]').forEach((button) => {
    button.addEventListener('click', () => {
      const price = Number(button.dataset.price);
      if (!confirm(`${button.title.split(' ')[0]} の土地を ${yen(price)} で購入しますか？`)) return;
      postAction('/realestate/buy', { cellId: Number(button.dataset.buyCell) }, rerender);
    });
  });
}
