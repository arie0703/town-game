import {
  BUILDINGS,
  buildingName,
  propertyValue,
  REALESTATE,
  sellPrice,
  STORES,
  type BuildingType,
  type StoreKind,
} from '../../../shared/master/buildings';
import type { MapCellView, Me } from '../../../shared/types';
import { api } from '../../api';
import { mapHtml } from '../../components/map';
import { yen } from '../../format';
import { escapeHtml } from '../../html';
import { postAction } from '../../layout';

type LotView = Extract<MapCellView, { type: 'lot' }>;

const pos = (cell: LotView) => `${cell.x + 1}-${cell.y + 1}`;

// 建物の種類と店舗の業種の説明（数値は購入フォームで出すので、ここでは説明だけ）
function guideHtml(): string {
  const stores = (Object.keys(STORES) as StoreKind[])
    .map((k) => `<li>${STORES[k].name}: ${STORES[k].description}</li>`)
    .join('');
  const buildings = (Object.keys(BUILDINGS) as BuildingType[])
    .map((b) => `<li><strong>${BUILDINGS[b].name}</strong>: ${BUILDINGS[b].description}${b === 'store' ? `<ul>${stores}</ul>` : ''}</li>`)
    .join('');
  return `<div class="box"><h3>建物の種類</h3><ul>${buildings}</ul></div>`;
}

// 所有している物件の一覧（売却ボタン付き）
function ownedHtml(lands: LotView[]): string {
  if (lands.length === 0) return '<p class="muted">所有している物件はありません。</p>';
  const rows = lands
    .map((cell) => {
      const building = cell.building ?? 'house';
      return `
        <tr>
          <td>${pos(cell)}</td>
          <td>${escapeHtml(buildingName(building, cell.storeKind))}</td>
          <td>${yen(propertyValue(cell.landPrice, building))}</td>
          <td>${yen(sellPrice(cell.landPrice, building))}</td>
          <td><button type="button" data-sell="${cell.id}" data-name="${escapeHtml(buildingName(building, cell.storeKind))}" data-price="${sellPrice(cell.landPrice, building)}">売る</button></td>
        </tr>
      `;
    })
    .join('');
  return `
    <table class="table list">
      <thead><tr><th>場所</th><th>建物</th><th>評価額</th><th>売却額</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// 空き地を選んだときの購入フォーム
function buyFormHtml(cell: LotView): string {
  const options = (Object.keys(BUILDINGS) as BuildingType[])
    .map(
      (b, i) =>
        `<label><input type="radio" name="building" value="${b}"${i === 0 ? ' checked' : ''} /> ${BUILDINGS[b].name}（${yen(propertyValue(cell.landPrice, b))}）</label>`,
    )
    .join(' ');
  const kinds = (Object.keys(STORES) as StoreKind[]).map((k) => `<option value="${k}">${STORES[k].name}</option>`).join('');
  return `
    <form class="box" id="buy-form">
      <h3>土地 ${pos(cell)}（土地の価格 ${yen(cell.landPrice)}）</h3>
      <p>${options}</p>
      <p id="store-kind" hidden><label>業種 <select name="storeKind">${kinds}</select></label></p>
      <button type="submit">購入して建てる</button>
    </form>
  `;
}

export async function renderRealestate(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const cells = await api.get<MapCellView[]>('/map');
  const lots = cells.filter((c): c is LotView => c.type === 'lot');
  const myLands = lots.filter((c) => c.owner?.id === me.id);
  const myValue = myLands.reduce((sum, c) => sum + propertyValue(c.landPrice, c.building ?? 'house'), 0);
  const full = myLands.length >= REALESTATE.maxProperties;

  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}　所有物件: ${myLands.length} / ${REALESTATE.maxProperties}件（評価額 ${yen(myValue)}）</p>
    ${ownedHtml(myLands)}
    <p class="note">物件は評価額の ${REALESTATE.sellRate * 100}% で売却でき、土地は空き地に戻る。マンション・店舗は、行動するたびに一定の確率で家賃・売上が入る。</p>
    ${guideHtml()}
    <p class="note">${full ? `物件は${REALESTATE.maxProperties}件までしか持てません。新しく買うには、物件を売ってください。` : '緑の空き地をクリックすると、建てる建物を選べます（町の中心ほど高い）。'}</p>
    ${mapHtml(cells, { myId: me.id, buyable: !full })}
    <div id="buy-panel"></div>
  `;

  const panel = container.querySelector<HTMLElement>('#buy-panel')!;
  container.querySelectorAll<HTMLButtonElement>('[data-buy-cell]').forEach((button) => {
    button.addEventListener('click', () => {
      const cell = lots.find((c) => c.id === Number(button.dataset.buyCell))!;
      panel.innerHTML = buyFormHtml(cell);
      const form = panel.querySelector<HTMLFormElement>('#buy-form')!;
      const storeKind = panel.querySelector<HTMLElement>('#store-kind')!;
      form.addEventListener('change', () => {
        storeKind.hidden = new FormData(form).get('building') !== 'store';
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const building = data.get('building') as BuildingType;
        const kind = building === 'store' ? (data.get('storeKind') as StoreKind) : null;
        const price = propertyValue(cell.landPrice, building);
        if (!confirm(`土地 ${pos(cell)} に${buildingName(building, kind)}を ${yen(price)} で建てますか？`)) return;
        postAction('/realestate/buy', { cellId: cell.id, building, storeKind: kind }, rerender);
      });
      form.scrollIntoView({ block: 'nearest' });
    });
  });
  container.querySelectorAll<HTMLButtonElement>('[data-sell]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!confirm(`${button.dataset.name}を ${yen(Number(button.dataset.price))} で売りますか？`)) return;
      postAction('/realestate/sell', { cellId: Number(button.dataset.sell) }, rerender);
    });
  });
}
