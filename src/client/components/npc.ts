import { NPCS, type NpcId } from '../../shared/master/npcs';
import { escapeHtml } from '../html';
import { iconHtml } from './pixel-icons';

function randomLine(id: NpcId): string {
  const lines = NPCS[id].lines;
  return lines[Math.floor(Math.random() * lines.length)];
}

// 店主のアイコンと吹き出し。line を省略すると、セリフをランダムに選ぶ
export function npcHtml(id: NpcId, line: string = randomLine(id)): string {
  return `
    <div class="npc">
      <div class="npc-icon" title="${escapeHtml(NPCS[id].name)}">${iconHtml(id)}</div>
      <div class="npc-bubble">
        <div class="npc-name">${escapeHtml(NPCS[id].name)}</div>
        <div>${escapeHtml(line)}</div>
      </div>
    </div>
  `;
}
