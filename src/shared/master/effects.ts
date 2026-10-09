import { ABILITIES, type Abilities } from '../abilities';
import { formatKg } from '../weight';

// アイテム・食堂メニュー共通の効果。必要なものだけ指定する
//   bodyPower / brainPower / condition: 増減（マイナスで低下）、weight: 体重の増減（kg）、height: 身長の増減（cm）、gain: 能力の増減
export type ConsumableEffect = {
  fullness?: number; // 満腹度の回復。食事（食事アイテム・食堂メニュー）のみ
  bodyPower?: number;
  brainPower?: number;
  condition?: number;
  weight?: number;
  height?: number;
  gain: Partial<Abilities>;
};

// 符号付きの数値（+5 / -5）
function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}

// 「パワー +2 / 腕力 +1」のような能力の増減の説明
export function describeGain(gain: Partial<Abilities>): string {
  return ABILITIES.filter((a) => gain[a.key])
    .map((a) => `${a.label} ${signed(gain[a.key]!)}`)
    .join(' / ');
}

// 効果の説明（マスタの値から生成する）
export function describeEffect(e: ConsumableEffect): string {
  const parts: string[] = [];
  if (e.fullness) parts.push(`満腹度 +${e.fullness}`);
  if (e.bodyPower && e.bodyPower === e.brainPower) {
    parts.push(`身体パワー・頭脳パワー ${signed(e.bodyPower)}`);
  } else {
    if (e.bodyPower) parts.push(`身体パワー ${signed(e.bodyPower)}`);
    if (e.brainPower) parts.push(`頭脳パワー ${signed(e.brainPower)}`);
  }
  if (e.condition) parts.push(`コンディション ${signed(e.condition)}`);
  if (e.weight) parts.push(`体重 ${e.weight > 0 ? '+' : '-'}${formatKg(Math.abs(e.weight))}`);
  if (e.height) parts.push(`身長 ${signed(e.height)}cm`);
  const gain = describeGain(e.gain);
  if (gain) parts.push(gain);
  return parts.join(' / ');
}
