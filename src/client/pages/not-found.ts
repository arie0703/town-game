export function renderNotFound(root: HTMLElement): void {
  root.innerHTML = `
    <h1>ページが見つかりません</h1>
    <p><a href="#/">トップへ戻る</a></p>
  `;
}
