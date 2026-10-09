import type { ActionResult, Me } from '../shared/types';
import { api, ApiError } from './api';
import { escapeHtml } from './html';

type Flash = { message: string; kind: 'info' | 'error' };

let flash: Flash | null = null;

// 次に描画する画面の上部にメッセージを出す
export function setFlash(message: string, kind: Flash['kind'] = 'info'): void {
  flash = { message, kind };
}

// アクション API を呼び、結果をフラッシュに積んでから画面を描き直す
export async function postAction(path: string, body: unknown, rerender: () => Promise<void>): Promise<void> {
  try {
    const result = await api.post<ActionResult>(path, body);
    setFlash(result.message);
  } catch (e) {
    setFlash(e instanceof ApiError ? e.message : '通信エラーが発生しました', 'error');
  }
  await rerender();
}

// ログイン後の画面共通の枠（ヘッダー + 本文）。本文を描画する要素を返す
export function renderLayout(root: HTMLElement, me: Me): HTMLElement {
  const current = flash;
  flash = null;
  root.innerHTML = `
    <header class="header">
      <a class="logo" href="#/home">TOWN</a>
      <span class="header-user">${escapeHtml(me.name)} さん</span>
      <nav>
        <a href="#/home">ホーム</a>
        <button type="button" id="logout">ログアウト</button>
      </nav>
    </header>
    ${current ? `<p class="flash flash-${current.kind}">${escapeHtml(current.message)}</p>` : ''}
    <main id="main"></main>
  `;
  root.querySelector('#logout')!.addEventListener('click', async () => {
    await api.post('/logout');
    location.hash = '#/';
  });
  return root.querySelector<HTMLElement>('#main')!;
}
