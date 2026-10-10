import type { Me } from '../../../shared/types';
import { yen } from '../../format';
import { postAction } from '../../layout';

export async function renderBank(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  container.innerHTML = `
    <table class="table bank-balance">
      <tr><th>持ち金</th><td>${yen(me.money)}</td></tr>
      <tr><th>預金残高</th><td>${yen(me.deposit)}</td></tr>
    </table>
    <div class="columns">
      <form class="box" id="deposit">
        <h3>預ける</h3>
        <label>金額 <input type="number" name="amount" min="1" max="${me.money}" value="${me.money}" required /></label>
        <button type="submit"${me.money === 0 ? ' disabled' : ''}>預ける</button>
        <button type="button" data-all="deposit"${me.money === 0 ? ' disabled' : ''}>全額</button>
      </form>
      <form class="box" id="withdraw">
        <h3>引き出す</h3>
        <label>金額 <input type="number" name="amount" min="1" max="${me.deposit}" value="${me.deposit}" required /></label>
        <button type="submit"${me.deposit === 0 ? ' disabled' : ''}>引き出す</button>
        <button type="button" data-all="withdraw"${me.deposit === 0 ? ' disabled' : ''}>全額</button>
      </form>
    </div>
    <p class="note">預金はストリートファイトで負けても減らない。ただし預金がある間は、食堂の炊き出しは利用できない。</p>
  `;

  const all = { deposit: me.money, withdraw: me.deposit };
  for (const kind of ['deposit', 'withdraw'] as const) {
    const form = container.querySelector<HTMLFormElement>(`#${kind}`)!;
    const input = form.querySelector<HTMLInputElement>('[name="amount"]')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      postAction(`/bank/${kind}`, { amount: Number(input.value) }, rerender);
    });
    form.querySelector(`[data-all="${kind}"]`)!.addEventListener('click', () => {
      postAction(`/bank/${kind}`, { amount: all[kind] }, rerender);
    });
  }
}
