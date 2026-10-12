import { isHardTravel, TRAVELS } from '../../../shared/master/travels';
import { noStaminaAttr } from '../../../shared/stamina';
import type { Me } from '../../../shared/types';
import { abilityEffectHtml, conditionEffectHtml } from '../../components/effect';
import { yen } from '../../format';
import { postAction } from '../../layout';

// 旅行代理店。お土産の種類・確率は画面に出さない（旅先で見つける楽しみにする）
export async function renderTravel(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const rows = TRAVELS.map((travel) => {
    // 持ち金・身体パワーが足りない旅行先は押せない
    const affordable = me.money >= travel.cost && me.bodyPower.current >= travel.powerCost;
    // 体力が下がる過酷な旅行先は、体力が 0 だと行けない
    const attr = !affordable ? ' disabled' : isHardTravel(travel) ? noStaminaAttr(me.condition) : '';
    return `
      <tr>
        <td>${travel.name}</td>
        <td class="nowrap">${yen(travel.cost)}</td>
        <td class="nowrap">${travel.powerCost}</td>
        <td>${conditionEffectHtml(travel.effect)}</td>
        <td>${abilityEffectHtml(travel.effect)}</td>
        <td class="nowrap"><button type="button" data-travel="${travel.id}"${attr}>Go</button></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <p>持ち金: ${yen(me.money)}　身体パワー: ${me.bodyPower.current} / ${me.bodyPower.max}</p>
    <table class="table list">
      <thead><tr><th>ツアー</th><th>費用</th><th>身体パワー</th><th>体調</th><th>能力</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="note">旅先では珍しいお土産が手に入ることも。</p>
  `;
  container.querySelectorAll<HTMLButtonElement>('[data-travel]').forEach((button) => {
    button.addEventListener('click', () => {
      const travel = TRAVELS.find((t) => t.id === button.dataset.travel)!;
      if (confirm(`${travel.name}（${yen(travel.cost)}）に行きますか？`)) postAction('/travel', { travelId: travel.id }, rerender);
    });
  });
}
