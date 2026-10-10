import { GANG, GANG_RANKS, gangPromotionChecks } from '../../../shared/master/gang';
import type { InventoryItem, Me } from '../../../shared/types';
import { api } from '../../api';
import { yen } from '../../format';
import { escapeHtml } from '../../html';
import { postAction } from '../../layout';

// 裏組織のアジト。所属の条件は画面に出さない（門を叩いて断られたら気づく）
export async function renderHideout(container: HTMLElement, me: Me, rerender: () => Promise<void>): Promise<void> {
  const gang = me.states.find((s) => s.id === 'gang');
  if (!gang) {
    container.innerHTML = '<p><button type="button" id="join">門を叩く</button></p>';
    container.querySelector('#join')!.addEventListener('click', () => postAction('/hideout/join', {}, rerender));
    return;
  }

  const rank = GANG_RANKS[gang.level];
  const next = GANG_RANKS[gang.level + 1];
  const s = GANG.shinogi;
  let promotionHtml = '<p class="muted">これ以上の出世はない。</p>';
  if (next?.promotion) {
    const inventory = await api.get<InventoryItem[]>('/items');
    const items = Object.fromEntries(inventory.map((i) => [i.itemId, i.quantity]));
    const checks = gangPromotionChecks(next.promotion, { money: me.money, abilities: me.abilities, items });
    const list = checks.map((c) => `<li${c.met ? '' : ' class="muted"'}>${escapeHtml(c.label)}${c.met ? ' ✓' : ''}</li>`).join('');
    promotionHtml = `
      <p>次の階級: <strong>${next.name}</strong></p>
      <ul>${list}</ul>
      <button type="button" id="promote"${checks.every((c) => c.met) ? '' : ' disabled'}>昇進する</button>
    `;
  }

  container.innerHTML = `
    <p>階級: <strong>${rank.name}</strong>　持ち金: ${yen(me.money)}</p>
    <div class="columns">
      <div class="box">
        <h3>シノギ</h3>
        <p class="note">身体パワー ${s.powerCost}・満腹度 ${s.fullnessCost} を使って稼ぐ。危ない橋もある。</p>
        <button type="button" id="shinogi">シノギに出る</button>
      </div>
      <div class="box">
        <h3>昇進</h3>
        ${promotionHtml}
      </div>
    </div>
    <p><button type="button" id="leave">足を洗う（足抜け料 ${yen(GANG.leaveFee)}）</button></p>
  `;
  container.querySelector('#shinogi')!.addEventListener('click', () => postAction('/hideout/shinogi', {}, rerender));
  container.querySelector('#promote')?.addEventListener('click', () => {
    if (confirm(`上納金 ${yen(next!.promotion!.tribute)} を納めて${next!.name}に昇進しますか？`)) {
      postAction('/hideout/promote', {}, rerender);
    }
  });
  container.querySelector('#leave')!.addEventListener('click', () => {
    if (confirm(`足抜け料 ${yen(GANG.leaveFee)} を払って足を洗いますか？`)) postAction('/hideout/leave', {}, rerender);
  });
}
