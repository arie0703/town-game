import type { TitleView } from '../../shared/types';
import { api } from '../api';
import { requireLogin } from '../auth';
import { dateTime } from '../format';
import { escapeHtml } from '../html';
import { renderLayout } from '../layout';

// 達成目録: 称号の一覧（マスタの順）。未解放の称号は名前・達成条件とも「？？？」と伏せる
export async function renderTitles(root: HTMLElement): Promise<void> {
  const me = await requireLogin();
  if (!me) return;
  const titles = await api.get<TitleView[]>('/titles');
  const earned = titles.filter((t) => t.name !== null).length;

  const rows = titles
    .map((t) =>
      t.name
        ? `<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.description ?? '')}</td><td class="nowrap">${t.earnedAt ? dateTime(t.earnedAt) : ''}</td></tr>`
        : '<tr class="muted"><td>？？？</td><td>？？？</td><td></td></tr>',
    )
    .join('');

  const main = renderLayout(root, me);
  main.innerHTML = `
    <section class="box">
      <h2>達成目録（${earned} / ${titles.length}）</h2>
      <table class="table list">
        <thead><tr><th>称号</th><th>達成条件</th><th>獲得日時</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p><a href="#/home">← 町に戻る</a></p>
    </section>
  `;
}
