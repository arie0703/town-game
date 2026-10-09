import { findFacility, type FacilityId } from '../../shared/master/facilities';
import type { Me } from '../../shared/types';
import { requireLogin } from '../auth';
import { renderLayout } from '../layout';
import { renderCafeteria } from './facilities/cafeteria';
import { renderCasino } from './facilities/casino';
import { renderJobCenter } from './facilities/job';
import { renderRealestate } from './facilities/realestate';
import { renderShop } from './facilities/shop';
import { renderTownhall } from './facilities/townhall';
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
  realestate: renderRealestate,
  townhall: renderTownhall,
};

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
    <section class="box facility">
      <h2>${facility.name}</h2>
      <p>${facility.description}</p>
      <div id="facility-body"></div>
      <p><a href="#/home">← 町に戻る</a></p>
    </section>
  `;

  await BODIES[facility.id](main.querySelector<HTMLElement>('#facility-body')!, me, () => renderFacility(root, params));
}
