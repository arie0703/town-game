import { effectForBmi } from '../../../shared/bmi';
import { LIMITS } from '../../../shared/config';
import { FACILITY_NPC } from '../../../shared/master/npcs';
import { findMama, SNACK_ACTIONS, type MamaId, type SnackActionId } from '../../../shared/master/snack';
import type { Me, SnackMamaView } from '../../../shared/types';
import { api } from '../../api';
import { abilityEffectHtml, conditionEffectHtml } from '../../components/effect';
import { npcHtml } from '../../components/npc';
import { yen } from '../../format';
import { postAction } from '../../layout';

// 選んでいるママ（描き直しても保つ）
let selected: MamaId = 'yoko';

// 友好度は段階名とゲージだけを出す（数値は出さない）
function affinityHtml(view: SnackMamaView): string {
  const percent = Math.round(view.progress * 100);
  return `<p>仲: <strong>${view.stageName}</strong> <span class="gauge"><span class="gauge-fill" style="width: ${percent}%"></span></span></p>`;
}

// スナック。裏組織に所属していると、紅ママの席も選べる（所属していない住民には紅ママの存在を見せない）
export async function renderSnack(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const views = await api.get<SnackMamaView[]>('/snack');
  const view = views.find((v) => v.id === selected) ?? views[0];
  selected = view.id;
  const mama = findMama(view.id)!;
  const bmi = me.bmi;
  const full = me.condition >= LIMITS.conditionMax;

  const tabs =
    views.length > 1
      ? `<p>隣に座るママ: ${views
          .map((v) => `<button type="button" data-mama="${v.id}"${v.id === selected ? ' disabled' : ''}>${findMama(v.id)!.name}</button>`)
          .join(' ')}</p>`
      : '';
  // 店の看板（施設画面の上の店主）と別のママを選んでいるときは、そのママの顔を出す
  const portrait = mama.npcId !== FACILITY_NPC.snack ? npcHtml(mama.npcId) : '';

  const menus = mama.menus.filter((m) => m.requiresStage === undefined || view.stage >= m.requiresStage);
  const menuRows = menus
    .map((m) => {
      const disabled = me.money < m.price || (!m.drink && full) ? ' disabled' : '';
      const label = m.requiresStage !== undefined ? `${m.name}（裏メニュー）` : m.name;
      return `
        <tr>
          <td>${label}</td>
          <td>${conditionEffectHtml(effectForBmi(m.effect, bmi))}</td>
          <td>${abilityEffectHtml(m.effect)}</td>
          <td class="nowrap">${yen(m.price)}</td>
          <td><button type="button" data-order="${m.id}"${disabled}>${m.drink ? '飲む' : '食べる'}</button></td>
        </tr>
      `;
    })
    .join('');

  const actionButtons = (Object.keys(SNACK_ACTIONS) as SnackActionId[])
    .map((id) => {
      const a = SNACK_ACTIONS[id];
      const brainPower = 'brainPower' in a ? a.brainPower : 0;
      const cost = [a.fee ? yen(a.fee) : '', brainPower ? `頭脳パワー ${brainPower}` : ''].filter(Boolean).join('・');
      const disabled = me.money < a.fee || me.brainPower.current < brainPower ? ' disabled' : '';
      return `<button type="button" data-action="${id}"${disabled}>${a.name}${cost ? `（${cost}）` : ''}</button>`;
    })
    .join(' ');

  container.innerHTML = `
    ${tabs}
    ${portrait}
    ${affinityHtml(view)}
    <p>持ち金: ${yen(me.money)}　体力: ${me.condition} / ${LIMITS.conditionMax}　頭脳パワー: ${me.brainPower.current} / ${me.brainPower.max}</p>
    <div class="actions">${actionButtons}</div>
    <table class="table list">
      <caption>メニュー</caption>
      <thead><tr><th>メニュー</th><th>体調</th><th>能力</th><th>価格</th><th></th></tr></thead>
      <tbody>${menuRows}</tbody>
    </table>
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-mama]').forEach((button) => {
    button.addEventListener('click', () => {
      selected = button.dataset.mama as MamaId;
      void rerender();
    });
  });
  container.querySelectorAll<HTMLButtonElement>('[data-order]').forEach((button) => {
    button.addEventListener('click', () => postAction('/snack/order', { mamaId: selected, menuId: button.dataset.order }, rerender));
  });
  container.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', () => postAction('/snack/action', { mamaId: selected, action: button.dataset.action }, rerender));
  });
}
