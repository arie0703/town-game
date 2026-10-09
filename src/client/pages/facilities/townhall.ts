import type { Me, ResidentView } from '../../../shared/types';
import { api } from '../../api';
import { yen } from '../../format';
import { escapeHtml } from '../../html';

function partner(r: ResidentView): string {
  if (r.spouse) return `配偶者: ${escapeHtml(r.spouse.name)}`;
  if (r.lover) return `恋人: ${escapeHtml(r.lover.name)}`;
  return '-';
}

export async function renderTownhall(container: HTMLElement, me: Me): Promise<void> {
  const residents = await api.get<ResidentView[]>('/residents');
  const rows = residents
    .map(
      (r) => `
        <tr${r.id === me.id ? ' class="row-current"' : ''}>
          <td>${r.rank}</td>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.jobName)}</td>
          <td>${yen(r.totalAssets)}</td>
          <td>${partner(r)}</td>
        </tr>
      `,
    )
    .join('');

  container.innerHTML = `
    <p>住民数: ${residents.length}人（総資産 = 持ち金 + 預金 + 所有土地の評価額）</p>
    <table class="table list">
      <thead><tr><th>順位</th><th>名前</th><th>職業</th><th>総資産</th><th>恋人/配偶者</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
