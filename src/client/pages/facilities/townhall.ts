import type { Me, ResidentView } from '../../../shared/types';
import { api } from '../../api';
import { GOODNESS } from '../../../shared/goodness';
import { isBlocked } from '../../../shared/master/states';
import { yen } from '../../format';
import { escapeHtml } from '../../html';
import { postAction } from '../../layout';

export async function renderTownhall(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const residents = await api.get<ResidentView[]>('/residents');
  const rows = residents
    .map(
      (r) => `
        <tr${r.id === me.id ? ' class="row-current"' : ''}>
          <td>${r.rank}</td>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.jobName)}</td>
          <td>${r.goodnessRank}</td>
          <td>${yen(r.totalAssets)}</td>
        </tr>
      `,
    )
    .join('');

  const maxDonation = Math.floor(me.money / GOODNESS.donationUnit) * GOODNESS.donationUnit;
  // 状態（裏組織所属など）で使えないときは、ボタンを押せなくする（理由は職員のセリフで伝える）
  const donateBlocked = isBlocked(me.states, 'donate');
  const volunteerBlocked = isBlocked(me.states, 'volunteer');
  container.innerHTML = `
    <p>あなたの善悪: <strong>${me.goodness.rank}（${me.goodness.value}）</strong></p>
    <div class="columns">
      <form class="box" id="donate">
        <h3>寄付する</h3>
        <p class="note">${yen(GOODNESS.donationUnit)}ごとに善悪 +1</p>
        <label>金額 <input type="number" name="amount" min="${GOODNESS.donationUnit}" step="${GOODNESS.donationUnit}" max="${maxDonation}" value="${GOODNESS.donationUnit}" required /></label>
        <button type="submit"${maxDonation === 0 || donateBlocked ? ' disabled' : ''}>寄付する</button>
      </form>
      <div class="box">
        <h3>ボランティア</h3>
        <p class="note">町のゴミ拾い。身体パワー ${GOODNESS.volunteerPowerCost} と満腹度 ${GOODNESS.volunteerFullnessCost} を使って善悪 +${GOODNESS.volunteerGain}</p>
        <button type="button" id="volunteer"${volunteerBlocked ? ' disabled' : ''}>参加する</button>
      </div>
    </div>
    <p>住民数: ${residents.length}人（総資産 = 持ち金 + 預金 + 所有物件の評価額）</p>
    <table class="table list">
      <thead><tr><th>順位</th><th>名前</th><th>職業</th><th>善悪</th><th>総資産</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const donate = container.querySelector<HTMLFormElement>('#donate')!;
  donate.addEventListener('submit', (e) => {
    e.preventDefault();
    postAction('/townhall/donate', { amount: Number(new FormData(donate).get('amount')) }, rerender);
  });
  container.querySelector('#volunteer')!.addEventListener('click', () => postAction('/townhall/volunteer', {}, rerender));
}
