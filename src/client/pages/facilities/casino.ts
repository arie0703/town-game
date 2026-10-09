import { CHOHAN } from '../../../shared/config';
import type { Me } from '../../../shared/types';
import { yen } from '../../format';
import { postAction } from '../../layout';

export async function renderCasino(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  if (me.money === 0) {
    container.innerHTML = `
      <p>持ち金がありません。賭けるものがないなら……<a href="#/facility/cafeteria">食堂の炊き出し</a>へどうぞ。</p>
    `;
    return;
  }

  const maxBet = Math.min(me.money, CHOHAN.maxBet);
  const canAllIn = me.money <= CHOHAN.maxBet;
  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}（1回の上限 ${yen(CHOHAN.maxBet)}）</p>
    <p class="note">サイコロ2個の合計が偶数なら「丁」、奇数なら「半」。当たれば賭け金の2倍がもらえる。</p>
    <form class="box chohan" id="chohan">
      <label>賭け金
        <input type="number" name="bet" min="1" max="${maxBet}" value="${Math.min(100, maxBet)}" required />
      </label>
      ${canAllIn ? '<button type="button" id="all-in">全額賭ける</button>' : ''}
      <div class="actions">
        <button type="submit" value="cho">丁（偶数）</button>
        <button type="submit" value="han">半（奇数）</button>
      </div>
    </form>
  `;

  const form = container.querySelector<HTMLFormElement>('#chohan')!;
  const betInput = form.querySelector<HTMLInputElement>('[name="bet"]')!;
  container.querySelector('#all-in')?.addEventListener('click', () => {
    betInput.value = String(me.money);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const guess = (e.submitter as HTMLButtonElement | null)?.value;
    postAction('/casino/chohan', { bet: Number(betInput.value), guess }, rerender);
  });
}
