import { findFacility } from '../../shared/master/facilities';
import { MAP_WIDTH } from '../../shared/master/map';
import type { MapCellView } from '../../shared/types';
import { yen } from '../format';
import { escapeHtml } from '../html';
import { iconHtml } from './pixel-icons';

// myId: 自分の土地を色分けする / buyable: 未購入の空き地を購入ボタンにする（不動産屋用）
type MapOptions = { myId?: number; buyable?: boolean };

function cellHtml(cell: MapCellView, options: MapOptions): string {
  switch (cell.type) {
    case 'road':
      return '<div class="cell cell-road"></div>';
    case 'lot': {
      const pos = `${cell.x + 1}-${cell.y + 1}`;
      if (cell.owner) {
        const mine = cell.owner.id === options.myId;
        const title = `${pos} ${cell.owner.name} の土地`;
        return `<div class="cell cell-lot ${mine ? 'cell-mine' : 'cell-owned'}" title="${escapeHtml(title)}">${iconHtml('house')}</div>`;
      }
      const title = `${pos} 空き地（${yen(cell.landPrice)}）`;
      return options.buyable
        ? `<button type="button" class="cell cell-lot cell-buyable" data-buy-cell="${cell.id}" data-price="${cell.landPrice}" title="${title}">${iconHtml('grass')}</button>`
        : `<div class="cell cell-lot" title="${title}">${iconHtml('grass')}</div>`;
    }
    case 'facility': {
      const facility = findFacility(cell.facilityId)!;
      return `<a class="cell cell-facility" href="#/facility/${facility.id}" title="${facility.name}" aria-label="${facility.name}">${iconHtml(facility.id)}</a>`;
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
      <span class="legend cell-mine"></span>自分の家（赤い屋根）
      <span class="legend cell-owned"></span>他の住民の家（橙の屋根）
    </p>
  `;
}
