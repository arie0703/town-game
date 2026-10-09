import type { JobView, Me } from '../../../shared/types';
import { api } from '../../api';
import { yen } from '../../format';
import { escapeHtml } from '../../html';
import { postAction } from '../../layout';

export async function renderJobCenter(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const jobs = await api.get<JobView[]>('/jobs');

  const rows = jobs
    .map((job) => {
      const requirements = job.requirements.length > 0 ? job.requirements.map(escapeHtml).join('<br>') : 'なし';
      const action = job.current
        ? '<strong>現職</strong>'
        : job.unmet.length > 0
          ? '<span class="muted">条件未達</span>'
          : `<button type="button" data-apply="${escapeHtml(job.id)}">就職する</button>`;
      return `
        <tr${job.current ? ' class="row-current"' : ''}>
          <td>${escapeHtml(job.name)}</td>
          <td>${yen(job.baseSalary)}</td>
          <td>${escapeHtml(job.powerLabel)}</td>
          <td>${requirements}</td>
          <td>${action}</td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <p>現在の職業: <strong>${escapeHtml(me.job.name)}</strong>
      ${me.job.id === 'none' ? '' : '<button type="button" id="quit">退職する</button>'}
    </p>
    <table class="table list">
      <thead><tr><th>職業</th><th>給料</th><th>消費</th><th>就職条件</th><th></th></tr></thead>
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
