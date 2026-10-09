import { ABILITIES, type Abilities } from '../abilities';
import { formatKg } from '../weight';

// アイテム・食堂メニュー共通の効果。必要なものだけ指定する
//   bodyPower / brainPower: 回復量、condition: 増減（マイナスで低下）、weight: 体重の増減（kg、マイナスで減る）、gain: 上がる能力
export type ConsumableEffect = {
  fullness?: number; // 満腹度の回復。食事（食事アイテム・食堂メニュー）のみ
  bodyPower?: number;
  brainPower?: number;
  condition?: number;
  weight?: number;
  gain: Partial<Abilities>;
};

// 「パワー +2 / 腕力 +1」のような能力上昇の説明
export function describeGain(gain: Partial<Abilities>): string {
  return ABILITIES.filter((a) => gain[a.key])
    .map((a) => `${a.label} +${gain[a.key]}`)
    .join(' / ');
}

// 効果の説明（マスタの値から生成する）
export function describeEffect(e: ConsumableEffect): string {
  const parts: string[] = [];
  if (e.fullness) parts.push(`満腹度 +${e.fullness}`);
  if (e.bodyPower && e.bodyPower === e.brainPower) {
    parts.push(`身体パワー・頭脳パワー +${e.bodyPower}`);
  } else {
    if (e.bodyPower) parts.push(`身体パワー +${e.bodyPower}`);
    if (e.brainPower) parts.push(`頭脳パワー +${e.brainPower}`);
  }
  if (e.condition) parts.push(`コンディション ${e.condition > 0 ? '+' : ''}${e.condition}`);
  if (e.weight) parts.push(`体重 ${e.weight > 0 ? '+' : '-'}${formatKg(Math.abs(e.weight))}`);
  const gain = describeGain(e.gain);
  if (gain) parts.push(gain);
  return parts.join(' / ');
}
