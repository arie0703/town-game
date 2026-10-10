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

// 効果の1項目。group: 表示する行（回復 / 体 / 能力）、tone: 色分け（良い / 悪い / どちらでもない）
export type EffectPart = {
  group: 'recover' | 'body' | 'ability';
  text: string;
  tone: 'plus' | 'minus' | 'neutral';
};

const toneOf = (value: number): EffectPart['tone'] => (value > 0 ? 'plus' : 'minus');

// 効果を項目のリストにする（マスタの値から生成する）。体重・身長は増減の良し悪しが人によるので neutral
export function effectParts(e: ConsumableEffect): EffectPart[] {
  const parts: EffectPart[] = [];
  if (e.fullness) parts.push({ group: 'recover', text: `満腹度 ${signed(e.fullness)}`, tone: toneOf(e.fullness) });
  if (e.bodyPower && e.bodyPower === e.brainPower) {
    parts.push({ group: 'recover', text: `身体パワー・頭脳パワー ${signed(e.bodyPower)}`, tone: toneOf(e.bodyPower) });
  } else {
    if (e.bodyPower) parts.push({ group: 'recover', text: `身体パワー ${signed(e.bodyPower)}`, tone: toneOf(e.bodyPower) });
    if (e.brainPower) parts.push({ group: 'recover', text: `頭脳パワー ${signed(e.brainPower)}`, tone: toneOf(e.brainPower) });
  }
  if (e.condition) parts.push({ group: 'body', text: `コンディション ${signed(e.condition)}`, tone: toneOf(e.condition) });
  if (e.weight) {
    parts.push({ group: 'body', text: `体重 ${e.weight > 0 ? '+' : '-'}${formatKg(Math.abs(e.weight))}`, tone: 'neutral' });
  }
  if (e.height) parts.push({ group: 'body', text: `身長 ${signed(e.height)}cm`, tone: 'neutral' });
  for (const a of ABILITIES) {
    const value = e.gain[a.key];
    if (value) parts.push({ group: 'ability', text: `${a.label} ${signed(value)}`, tone: toneOf(value) });
  }
  return parts;
}

// 効果の説明（1行の文字列。アクション結果のメッセージ用）
export function describeEffect(e: ConsumableEffect): string {
  return effectParts(e)
    .map((p) => p.text)
    .join(' / ');
}
