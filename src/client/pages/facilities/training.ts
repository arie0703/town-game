import { describeTraining, TRAININGS, type Training } from '../../../shared/master/trainings';
import type { Me } from '../../../shared/types';
import { yen } from '../../format';
import { postAction } from '../../layout';

function renderTrainings(container: HTMLElement, me: Me, rerender: () => Promise<void>, facility: Training['facility']): void {
  const isGym = facility === 'gym';
  const power = isGym ? me.bodyPower : me.brainPower;
  const rows = TRAININGS.filter((t) => t.facility === facility)
    .map(
      (t) => `
        <tr>
          <td>${t.name}</td>
          <td>${describeTraining(t)}</td>
          <td class="nowrap">${isGym ? '身体' : '頭脳'}パワー ${t.powerCost} / ${yen(t.fee)}</td>
          <td><button type="button" data-training="${t.id}">${isGym ? 'やる' : '受ける'}</button></td>
        </tr>
      `,
    )
    .join('');

  container.innerHTML = `
    <p>${isGym ? '身体' : '頭脳'}パワー: ${power.current} / ${power.max}　持ち金: ${yen(me.money)}　コンディション: ${me.condition} / 100</p>
    <p class="note">能力の上昇量はコンディションが 80 以上のときの値。コンディションが下がると上昇量も減る。</p>
    <table class="table list">
      <thead><tr><th>${isGym ? '種目' : '授業'}</th><th>効果</th><th>消費</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  container.querySelectorAll<HTMLButtonElement>('[data-training]').forEach((button) => {
    button.addEventListener('click', () => postAction('/training', { trainingId: button.dataset.training }, rerender));
  });
}

export async function renderSchool(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  renderTrainings(container, me, rerender, 'school');
}

export async function renderGym(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  renderTrainings(container, me, rerender, 'gym');
}
