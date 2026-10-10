// 体重は DB・サーバー内部ではグラムの整数で持ち（誤差を出さないため）、マスタ・API・画面では kg で扱う

export function kgToG(kg: number): number {
  return Math.round(kg * 1000);
}

// 表示用に 0.1kg 単位へ丸めた kg
export function gToKg(g: number): number {
  return Math.round(g / 100) / 10;
}

// 「0.5kg」「72.0kg」のような表示
export function formatKg(kg: number): string {
  return `${kg.toFixed(1)}kg`;
}
