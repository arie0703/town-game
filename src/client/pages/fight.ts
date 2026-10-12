import { FIGHT } from '../../shared/config';
import { noStaminaAttr } from '../../shared/stamina';
import { requireLogin } from '../auth';
import { gauge, yen } from '../format';
import { postAction, renderLayout } from '../layout';

export async function renderFight(root: HTMLElement): Promise<void> {
  const me = await requireLogin();
  if (!me) return;

  const main = renderLayout(root, me);
  main.innerHTML = `
    <section class="box">
      <h2>ストリートファイト</h2>
      <p>町の誰かにランダムで勝負を挑む。身体の能力が高いほど勝ちやすい。</p>
      <ul>
        <li>勝てば相手の強さに応じた賞金がもらえる</li>
        <li><strong>負けると持ち金が半分になり、体力が大きく下がる</strong></li>
        <li>挑まれた相手には何も起こらない</li>
      </ul>
      <table class="table">
        <tr><th>持ち金</th><td>${yen(me.money)}</td></tr>
        <tr><th>身体パワー</th><td>${gauge(me.bodyPower.current, me.bodyPower.max)}（1回 ${FIGHT.powerCost} 消費）</td></tr>
        <tr><th>体力</th><td>${gauge(me.condition, 100)}</td></tr>
        <tr><th>身体合計</th><td>${me.bodyTotal}</td></tr>
      </table>
      <button type="button" id="fight"${noStaminaAttr(me.condition)}>戦う</button>
      <p><a href="#/home">← 町に戻る</a></p>
    </section>
  `;
  main.querySelector('#fight')!.addEventListener('click', () => postAction('/fight', {}, () => renderFight(root)));
}
