import { ABILITIES, ABILITY_CATEGORIES, type AbilityCategory } from '../../shared/abilities';
import type { EventItem, MapCellView, Me, UserRef } from '../../shared/types';
import { api } from '../api';
import { requireLogin } from '../auth';
import { bindMapHint, mapHtml } from '../components/map';
import { dateTime, gauge, yen } from '../format';
import { formatKg } from '../../shared/weight';
import { escapeHtml } from '../html';
import { postAction, renderLayout } from '../layout';

function userName(user: UserRef | null): string {
  return user ? escapeHtml(user.name) : 'なし';
}

function statusTable(me: Me): string {
  const rows: Array<[string, string]> = [
    ['持ち金', yen(me.money)],
    ['預金', yen(me.deposit)],
    ['総資産', yen(me.totalAssets)],
    ['善悪', `${me.goodness.rank}（${me.goodness.value}）`],
    ['職業', me.job.id === 'none' ? escapeHtml(me.job.name) : `${escapeHtml(me.job.name)}（Lv${me.job.level}）`],
    ['身体パワー', gauge(me.bodyPower.current, me.bodyPower.max)],
    ['頭脳パワー', gauge(me.brainPower.current, me.brainPower.max)],
    ['コンディション', gauge(me.condition, 100)],
    ['満腹度', gauge(me.fullness, 100)],
    ['身長', `${me.height} cm`],
    ['体重', formatKg(me.weight)],
    ['BMI', String(me.bmi)],
    ['恋人', userName(me.lover)],
    ['配偶者', userName(me.spouse)],
  ];
  return `
    <table class="table">
      <caption>ステータス</caption>
      ${rows.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('')}
    </table>
  `;
}

function abilityTable(me: Me, category: AbilityCategory): string {
  const total = category === 'brain' ? me.brainTotal : category === 'body' ? me.bodyTotal : null;
  const rows = ABILITIES.filter((a) => a.category === category)
    .map((a) => `<tr><th>${a.label}</th><td>${me.abilities[a.key]}</td></tr>`)
    .join('');
  return `
    <table class="table">
      <caption>${ABILITY_CATEGORIES[category]}${total === null ? '' : `（合計 ${total}）`}</caption>
      ${rows}
    </table>
  `;
}

function eventList(events: EventItem[]): string {
  if (events.length === 0) return '<p>まだ出来事はありません。</p>';
  return `
    <ul class="events">
      ${events.map((e) => `<li><span class="event-time">${dateTime(e.createdAt)}</span>${escapeHtml(e.message)}</li>`).join('')}
    </ul>
  `;
}

export async function renderHome(root: HTMLElement): Promise<void> {
  const me = await requireLogin();
  if (!me) return;
  const [events, cells] = await Promise.all([api.get<EventItem[]>('/events'), api.get<MapCellView[]>('/map')]);

  const main = renderLayout(root, me);
  main.innerHTML = `
    <div class="home">
      <section>
        ${statusTable(me)}
      </section>
      <section>
        <div class="box">
          <h2>アクション</h2>
          <div class="actions">
            <button type="button" id="work"${me.job.id === 'none' ? ' disabled title="職業安定所で仕事を探しましょう"' : ''}>仕事</button>
            <button type="button" id="rest">休息</button>
            <a class="button" href="#/items">アイテム</a>
            <a class="button" href="#/fight">ストリートファイト</a>
            <a class="button" href="#/love">恋愛</a>
          </div>
        </div>
        <div class="abilities">
          ${abilityTable(me, 'brain')}
          ${abilityTable(me, 'body')}
          ${abilityTable(me, 'other')}
        </div>
      </section>
    </div>
    <section class="box">
      <h2>町の地図 <span class="map-hint" aria-live="polite"></span></h2>
      ${mapHtml(cells, { myId: me.id })}
    </section>
    <section class="box">
      <h2>出来事</h2>
      ${eventList(events)}
    </section>
  `;

  bindMapHint(main, main.querySelector<HTMLElement>('.map-hint')!);
  const rerender = () => renderHome(root);
  main.querySelector('#work')!.addEventListener('click', () => postAction('/work', {}, rerender));
  main.querySelector('#rest')!.addEventListener('click', () => postAction('/rest', {}, rerender));
}
