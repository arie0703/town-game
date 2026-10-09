import type { FacilityId } from './facilities';

// 施設の店主とセリフ。アイコンは pixel-icons.ts の同名のドット絵（assets/icons/ の画像でも差し替え可）
export const NPCS = {
  npc_shop: {
    name: '店主のゲンさん',
    lines: ['いらっしゃい！今日はいいステーキが入ってるよ', 'プロテイン？筋肉は裏切らないねえ', '激辛カップ麺は自己責任でな', '冷やかしでも大歓迎だよ！'],
  },
  npc_job: {
    name: '相談員の堅山さん',
    lines: ['あなたにぴったりの仕事、きっとあります', '条件が足りない？学校とジムで鍛えましょう', '無職も立派な肩書き……ではないですね', '体を使う仕事はやせますよ'],
  },
  npc_school: {
    name: '鈴木先生',
    lines: ['さあ、授業を始めますよ', '予習はしてきましたか？', '漫才研究会の顧問もやっています', '学びに遅すぎることはありません'],
  },
  npc_gym: {
    name: 'トレーナーの剛田',
    lines: ['筋肉は一日にしてならず！', 'ラスト1セット、いけるぞ！', 'プロテインは飲んだか？', '走れ！脂肪は燃やすためにある！'],
  },
  npc_cafeteria: {
    name: '食堂のおばちゃん',
    lines: ['いっぱい食べな！', 'ギガ盛り、残したら罰金だよ……冗談さ', '野菜も食べなさいよ', '今日の日替わりは自信作だよ'],
  },
  npc_casino: {
    name: '壺振り師の銀次',
    lines: ['さあ、張った張った！', '丁か半か、運命の分かれ道でござんす', '全額張る度胸、ありやすかい？', '勝って兜の緒を締めよ、ってね'],
  },
  npc_realestate: {
    name: '地主の田畑社長',
    lines: ['土地は裏切りませんよ', '町の真ん中ほど値が張ります', '一度買ったら売れませんからね、ハハハ', 'いい物件、ありますよ'],
  },
  npc_townhall: {
    name: '役場の佐藤さん',
    lines: ['住民の皆さんの総資産、ばっちり把握しています', '目指せ、長者番付1位！', '本日も町は平和です', '婚姻届はこちら……ではありません'],
  },
  npc_izakaya: {
    name: '居酒屋の大将',
    lines: ['へいらっしゃい！', 'とりあえず生でいいかい？', '飲みすぎは明日の自分が困るぜ', '〆のラーメンは別腹だろ？'],
  },
  npc_soup: {
    name: '炊き出しおじさん',
    lines: ['よう、腹減ってるんだろ。おにぎり食いな', '金がなくても腹は減る。それが人生さ', 'また来たのかい。……まあ、食いな', '今日のおにぎりは塩むすびだ'],
  },
} as const;

export type NpcId = keyof typeof NPCS;

export const FACILITY_NPC: Record<FacilityId, NpcId> = {
  shop: 'npc_shop',
  job: 'npc_job',
  school: 'npc_school',
  gym: 'npc_gym',
  cafeteria: 'npc_cafeteria',
  casino: 'npc_casino',
  realestate: 'npc_realestate',
  izakaya: 'npc_izakaya',
  townhall: 'npc_townhall',
};

// 小銭が残っていて炊き出しを使えないときの、炊き出しおじさんのセリフ
export const SOUP_REFUSAL_LINE = 'お前さん、まだ小銭を持ってるだろ？一文無しになったらおいで';
