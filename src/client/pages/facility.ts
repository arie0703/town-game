import { findFacility, type FacilityId } from '../../shared/master/facilities';
import { FACILITY_NPC, HIDEOUT_OUTSIDER_LINE } from '../../shared/master/npcs';
import { stateNpcLine } from '../../shared/master/states';
import { npcHtml } from '../components/npc';
import type { Me } from '../../shared/types';
import { requireLogin } from '../auth';
import { renderLayout } from '../layout';
import { renderBank } from './facilities/bank';
import { renderCafeteria } from './facilities/cafeteria';
import { renderCasino } from './facilities/casino';
import { renderHideout } from './facilities/hideout';
import { renderIzakaya } from './facilities/izakaya';
import { renderJobCenter } from './facilities/job';
import { renderRealestate } from './facilities/realestate';
import { renderBlackmarket, renderShop } from './facilities/shop';
import { renderSnack } from './facilities/snack';
import { renderTownhall } from './facilities/townhall';
import { renderTravel } from './facilities/travel';
import { renderGym, renderSchool } from './facilities/training';
import { renderNotFound } from './not-found';

type FacilityBody = (container: HTMLElement, me: Me, rerender: () => Promise<void>) => Promise<void>;

// 施設ごとの中身
const BODIES: Record<FacilityId, FacilityBody> = {
  job: renderJobCenter,
  school: renderSchool,
  gym: renderGym,
  shop: renderShop,
  cafeteria: renderCafeteria,
  casino: renderCasino,
  izakaya: renderIzakaya,
  snack: renderSnack,
  realestate: renderRealestate,
  bank: renderBank,
  blackmarket: renderBlackmarket,
  hideout: renderHideout,
  travel: renderTravel,
  townhall: renderTownhall,
};

// 状態などで決まる店主のセリフ（undefined ならランダム）
function npcLine(facility: FacilityId, me: Me): string | undefined {
  if (facility === 'hideout') return me.states.some((s) => s.id === 'gang') ? '' : HIDEOUT_OUTSIDER_LINE;
  return stateNpcLine(me.states, facility);
}

export async function renderFacility(root: HTMLElement, params: Record<string, string>): Promise<void> {
  const facility = findFacility(params.id);
  if (!facility) {
    renderNotFound(root);
    return;
  }
  const me = await requireLogin();
  if (!me) return;

  const main = renderLayout(root, me);
  main.innerHTML = `
    <section class="box facility facility-${facility.id}">
      <h2>${facility.name}</h2>
      <p>${facility.description}</p>
      ${npcHtml(FACILITY_NPC[facility.id], npcLine(facility.id, me))}
      <div id="facility-body"></div>
      <p><a href="#/home">← 町に戻る</a></p>
    </section>
  `;

  await BODIES[facility.id](main.querySelector<HTMLElement>('#facility-body')!, me, () => renderFacility(root, params));
}
