import { buildingName, BUILDINGS, STORES, type BuildingType, type StoreKind } from '../../shared/master/buildings';
import { findFacility } from '../../shared/master/facilities';
import { MAP_WIDTH } from '../../shared/master/map';
import type { MapCellView } from '../../shared/types';
import { yen } from '../format';
import { escapeHtml } from '../html';
import { iconHtml, type PixelIconName } from './pixel-icons';

// myId: 自分の土地を色分けする / buyable: 未購入の空き地を購入ボタンにする（不動産屋用）
type MapOptions = { myId?: number; buyable?: boolean };

// 物件の建物に合うアイコン
function buildingIcon(building: BuildingType | null, storeKind: StoreKind | null): PixelIconName {
  if (building === 'mansion') return 'mansion';
  if (building === 'store' && storeKind) return `store_${storeKind}`;
  return 'house';
}

function cellHtml(cell: MapCellView, options: MapOptions): string {
  switch (cell.type) {
    case 'road':
      return '<div class="cell cell-road"></div>';
    case 'lot': {
      const pos = `${cell.x + 1}-${cell.y + 1}`;
      if (cell.owner) {
        const mine = cell.owner.id === options.myId;
        const name = buildingName(cell.building ?? 'house', cell.storeKind);
        const title = `${pos} ${cell.owner.name} の${name}`;
        // ヒントは「〇〇さんのコンビニ」のように、店舗は業種名で出す
        const shortName =
          cell.building === 'store' && cell.storeKind ? STORES[cell.storeKind].name : BUILDINGS[cell.building ?? 'house'].name;
        const hint = `${cell.owner.name}の${shortName}`;
        return `<div class="cell cell-lot ${mine ? 'cell-mine' : 'cell-owned'}" tabindex="0" data-hint="${escapeHtml(hint)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(hint)}">${iconHtml(buildingIcon(cell.building, cell.storeKind))}</div>`;
      }
      const title = `${pos} 空き地（${yen(cell.landPrice)}）`;
      return options.buyable
        ? `<button type="button" class="cell cell-lot cell-buyable" data-buy-cell="${cell.id}" data-price="${cell.landPrice}" title="${title}">${iconHtml('grass')}</button>`
        : `<div class="cell cell-lot" title="${title}">${iconHtml('grass')}</div>`;
    }
    case 'facility': {
      const facility = findFacility(cell.facilityId)!;
      return `<a class="cell cell-facility" href="#/facility/${facility.id}" data-facility="${facility.id}" title="${facility.name}" aria-label="${facility.name}">${iconHtml(facility.id)}</a>`;
    }
  }
}

export function mapHtml(cells: MapCellView[], options: MapOptions = {}): string {
  return `
    <div class="map" style="grid-template-columns: repeat(${MAP_WIDTH}, var(--cell-size))">
      ${cells.map((cell) => cellHtml(cell, options)).join('')}
    </div>
    <p class="note map-legend">
      <span class="legend cell-lot"></span>空き地
      <span class="legend cell-mine"></span>自分の物件（赤い屋根）
      <span class="legend cell-owned"></span>他の住民の物件（橙の屋根）
    </p>
  `;
}

// 施設・物件にカーソルを合わせた（またはフォーカスした）ときに、hint に説明を表示する
//   施設: 「施設名: 説明」、物件: 「〇〇のコンビニ」
export function bindMapHint(container: HTMLElement, hint: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('[data-facility], [data-hint]').forEach((cell) => {
    const show = () => {
      if (cell.dataset.hint) {
        hint.textContent = cell.dataset.hint;
        return;
      }
      const facility = findFacility(cell.dataset.facility!);
      hint.textContent = facility ? `${facility.name}: ${facility.description}` : '';
    };
    const clear = () => {
      hint.textContent = '';
    };
    cell.addEventListener('mouseenter', show);
    cell.addEventListener('focus', show);
    cell.addEventListener('mouseleave', clear);
    cell.addEventListener('blur', clear);
  });
}
