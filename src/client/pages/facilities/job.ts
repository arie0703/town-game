import type { JobView, Me } from '../../../shared/types';
import { formatKg } from '../../../shared/weight';
import { api } from '../../api';
import { gauge, yen } from '../../format';
import { escapeHtml } from '../../html';
import { postAction } from '../../layout';

function weightText(kg: number): string {
  if (kg === 0) return '±0';
  return `${kg > 0 ? '+' : '-'}${formatKg(Math.abs(kg))}`;
}

function levelText(job: JobView): string {
  if (job.exp === 0) return '<span class="muted">-</span>';
  const next = job.nextExp === null ? '（MAX）' : `（次まで ${job.nextExp - job.exp}）`;
  return `Lv${job.level}<br><span class="note">${job.exp} exp${next}</span>`;
}

function actionHtml(job: JobView): string {
  if (job.current) return '<strong>現職</strong>';
  if (job.unmet.length > 0) return '<span class="muted">条件未達</span>';
  const label = job.promotionFrom ? '昇進する' : '就職する';
  return `<button type="button" data-apply="${escapeHtml(job.id)}">${label}</button>`;
}

export async function renderJobCenter(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const jobs = await api.get<JobView[]>('/jobs');
  const current = jobs.find((j) => j.current);

  const rows = jobs
    .map((job) => {
      const requirements = job.requirements.length > 0 ? job.requirements.map(escapeHtml).join('<br>') : 'なし';
      // 系統を字下げで表す（上位職ほど右へ）
      const indent = job.depth > 0 ? `<span class="job-indent" style="width: ${job.depth * 1.2}em">└</span>` : '';
      return `
        <tr${job.current ? ' class="row-current"' : ''}>
          <td class="nowrap">${indent}${escapeHtml(job.name)}</td>
          <td>${yen(job.baseSalary)}</td>
          <td>${escapeHtml(job.powerLabel)}</td>
          <td class="nowrap">${weightText(job.weightChange)}</td>
          <td class="nowrap">${levelText(job)}</td>
          <td>${requirements}</td>
          <td>${actionHtml(job)}</td>
        </tr>
      `;
    })
    .join('');

  const currentLevel =
    current && current.nextExp !== null
      ? `　職業レベル: Lv${current.level} ${gauge(current.exp, current.nextExp)}`
      : current
        ? `　職業レベル: Lv${current.level}（MAX）`
        : '';

  container.innerHTML = `
    <p>現在の職業: <strong>${escapeHtml(me.job.name)}</strong>${currentLevel}
      ${me.job.id === 'none' ? '' : '<button type="button" id="quit">退職する</button>'}
    </p>
    <p class="note">働くたびにその職業の経験値が 1 増える。上位職へは、昇進元の職業に就いた状態で、職業レベルなどの条件を満たすと昇進できる。経験値は転職しても職業ごとに残る。</p>
    <table class="table list">
      <thead><tr><th>職業</th><th>給料</th><th>消費</th><th>体重</th><th>レベル</th><th>就職・昇進条件</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-apply]').forEach((button) => {
    button.addEventListener('click', () => postAction('/jobs/apply', { jobId: button.dataset.apply }, rerender));
  });
  container.querySelector('#quit')?.addEventListener('click', () => {
    if (confirm('本当に退職しますか？')) postAction('/jobs/quit', {}, rerender);
  });
}
