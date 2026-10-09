import type { LoveRequestView, LoveState } from '../../shared/types';
import { api } from '../api';
import { requireLogin } from '../auth';
import { dateTime } from '../format';
import { escapeHtml } from '../html';
import { postAction, renderLayout } from '../layout';

const TYPE_LABEL = { date: '交際の申し込み', propose: 'プロポーズ' } as const;

function requestList(requests: LoveRequestView[], incoming: boolean): string {
  if (requests.length === 0) return '<p>ありません。</p>';
  return `
    <ul class="events">
      ${requests
        .map(
          (r) => `
            <li>
              <span class="event-time">${dateTime(r.createdAt)}</span>
              ${escapeHtml(r.user.name)}さん${incoming ? 'から' : 'へ'}の${TYPE_LABEL[r.type]}
              ${
                incoming
                  ? `<button type="button" data-accept="${r.id}">承認する</button>
                     <button type="button" data-reject="${r.id}">断る</button>`
                  : '<span class="muted">（返事待ち）</span>'
              }
            </li>
          `,
        )
        .join('')}
    </ul>
  `;
}

function partnerSection(state: LoveState): string {
  if (state.spouse) {
    return `
      <p>配偶者: <strong>${escapeHtml(state.spouse.name)}</strong>さん</p>
      <button type="button" id="divorce">離婚する</button>
    `;
  }
  if (state.lover) {
    const proposing = state.outgoing.some((r) => r.type === 'propose');
    return `
      <p>恋人: <strong>${escapeHtml(state.lover.name)}</strong>さん</p>
      <button type="button" id="propose"${proposing ? ' disabled' : ''}>プロポーズする</button>
      <button type="button" id="breakup">別れる</button>
    `;
  }
  if (state.candidates.length === 0) return '<p>恋人はいません。今は申し込める相手がいないようです。</p>';
  return `
    <p>恋人はいません。</p>
    <label>気になる人
      <select id="candidate">
        ${state.candidates.map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}
      </select>
    </label>
    <button type="button" id="request">交際を申し込む</button>
  `;
}

export async function renderLove(root: HTMLElement): Promise<void> {
  const me = await requireLogin();
  if (!me) return;
  const state = await api.get<LoveState>('/love');
  const rerender = () => renderLove(root);

  const main = renderLayout(root, me);
  main.innerHTML = `
    <section class="box">
      <h2>恋愛</h2>
      ${partnerSection(state)}
    </section>
    <section class="box">
      <h2>届いた申し込み</h2>
      ${requestList(state.incoming, true)}
    </section>
    <section class="box">
      <h2>送った申し込み</h2>
      ${requestList(state.outgoing, false)}
      <p><a href="#/home">← 町に戻る</a></p>
    </section>
  `;

  main.querySelector('#request')?.addEventListener('click', () => {
    const toId = Number(main.querySelector<HTMLSelectElement>('#candidate')!.value);
    postAction('/love/request', { toId }, rerender);
  });
  main.querySelector('#propose')?.addEventListener('click', () => postAction('/love/propose', {}, rerender));
  main.querySelector('#breakup')?.addEventListener('click', () => {
    if (confirm('本当に別れますか？')) postAction('/love/breakup', {}, rerender);
  });
  main.querySelector('#divorce')?.addEventListener('click', () => {
    if (confirm('本当に離婚しますか？')) postAction('/love/divorce', {}, rerender);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach((b) => {
    b.addEventListener('click', () => postAction('/love/respond', { requestId: Number(b.dataset.accept), accept: true }, rerender));
  });
  main.querySelectorAll<HTMLButtonElement>('[data-reject]').forEach((b) => {
    b.addEventListener('click', () => postAction('/love/respond', { requestId: Number(b.dataset.reject), accept: false }, rerender));
  });
}
