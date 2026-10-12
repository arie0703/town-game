// 体力が 0 のときは、体を酷使する行動（仕事・ジム・ストリートファイト・シノギ・ボランティア・過酷な旅行）ができない
export const NO_STAMINA_TITLE = '体力が残っていません。食事か休息で回復しましょう';

export function hasStamina(condition: number): boolean {
  return condition > 0;
}

// 体力がないときにボタンへ付ける属性（押せなくして、理由を title に出す）
export function noStaminaAttr(condition: number): string {
  return hasStamina(condition) ? '' : ` disabled title="${NO_STAMINA_TITLE}"`;
}
