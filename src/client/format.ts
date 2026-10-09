export { yen } from '../shared/format';

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 現在値 / 最大値 をバー付きで表示する HTML
export function gauge(current: number, max: number): string {
  const percent = max > 0 ? Math.round((current / max) * 100) : 0;
  return `
    <span class="gauge"><span class="gauge-fill" style="width: ${Math.min(100, percent)}%"></span></span>
    ${current} / ${max}
  `;
}
