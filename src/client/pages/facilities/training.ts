import { ABILITIES, type AbilityCategory } from '../../../shared/abilities';
import { TRAINING } from '../../../shared/config';
import type { Me } from '../../../shared/types';
import { yen } from '../../format';
import { postAction } from '../../layout';

function renderTraining(
  container: HTMLElement,
  me: Me,
  rerender: () => Promise<void>,
  options: { category: AbilityCategory; path: string; verb: string; power: string; current: number },
): void {
  const rows = ABILITIES.filter((a) => a.category === options.category)
    .map(
      (a) => `
        <tr>
          <td>${a.label}</td>
          <td>${me.abilities[a.key]}</td>
          <td><button type="button" data-ability="${a.key}">${options.verb}</button></td>
        </tr>
      `,
    )
    .join('');

  container.innerHTML = `
    <p>1回あたり: ${options.power} ${TRAINING.powerCost} / ${yen(TRAINING.fee)}（${options.power}: ${options.current}、持ち金: ${yen(me.money)}）</p>
    <p class="note">コンディションが良いほど能力が大きく上がります。</p>
    <table class="table list">
      <thead><tr><th>項目</th><th>現在値</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  container.querySelectorAll<HTMLButtonElement>('[data-ability]').forEach((button) => {
    button.addEventListener('click', () => postAction(options.path, { ability: button.dataset.ability }, rerender));
  });
}

export async function renderSchool(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  renderTraining(container, me, rerender, {
    category: 'brain',
    path: '/school',
    verb: '勉強する',
    power: '頭脳パワー',
    current: me.brainPower.current,
  });
}

export async function renderGym(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  renderTraining(container, me, rerender, {
    category: 'body',
    path: '/gym',
    verb: '鍛える',
    power: '身体パワー',
    current: me.bodyPower.current,
  });
}
