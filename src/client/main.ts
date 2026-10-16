import './style.css';
import { renderFacility } from './pages/facility';
import { renderFight } from './pages/fight';
import { renderHome } from './pages/home';
import { renderItems } from './pages/items';
import { renderNotFound } from './pages/not-found';
import { renderTitles } from './pages/titles';
import { renderTop } from './pages/top';

type Page = (root: HTMLElement, params: Record<string, string>) => void | Promise<void>;

// hash のパス（例: "/facility/:id"）と描画関数の対応表
const routes: Array<[string, Page]> = [
  ['/', renderTop],
  ['/home', renderHome],
  ['/facility/:id', renderFacility],
  ['/items', renderItems],
  ['/fight', renderFight],
  ['/titles', renderTitles],
];

function matchRoute(path: string): { page: Page; params: Record<string, string> } {
  const segments = path.split('/').filter(Boolean);
  for (const [pattern, page] of routes) {
    const patternSegments = pattern.split('/').filter(Boolean);
    if (patternSegments.length !== segments.length) continue;
    const params: Record<string, string> = {};
    const matched = patternSegments.every((seg, i) => {
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = decodeURIComponent(segments[i]);
        return true;
      }
      return seg === segments[i];
    });
    if (matched) return { page, params };
  }
  return { page: renderNotFound, params: {} };
}

async function render(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>('#app')!;
  const path = location.hash.replace(/^#/, '') || '/';
  const { page, params } = matchRoute(path);
  await page(root, params);
}

window.addEventListener('hashchange', render);
render();
