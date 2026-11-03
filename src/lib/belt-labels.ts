// 帯の表示。道場生向けの文はふりがなの書き方（{漢字|よみ}）で返す
const colorReading: Record<string, string> = {
  白色: "しろ",
  水色: "みずいろ",
  黄色: "きいろ",
  緑色: "みどり",
  紫色: "むらさき",
  茶色: "ちゃいろ",
  黒色: "くろ",
};
// 帯に書く色の名前（「水色帯」の「水色」。「黄色」は「黄」にしない）
const colorName: Record<string, string> = {
  白色: "白",
  水色: "水色",
  黄色: "黄色",
  緑色: "緑",
  紫色: "紫",
  茶色: "茶",
  黒色: "黒",
};
const colorNameReading: Record<string, string> = {
  白: "しろ",
  水色: "みずいろ",
  黄色: "きいろ",
  緑: "みどり",
  紫: "むらさき",
  茶: "ちゃ",
  黒: "くろ",
};

// 帯の色（画面の帯）
const colorHex: Record<string, string> = {
  白色: "#ffffff",
  水色: "#7dc6ea",
  黄色: "#e8c23a",
  緑色: "#4a9a54",
  紫色: "#7d4c9e",
  茶色: "#7a4a24",
  黒色: "#151515",
};

type BeltLike = { rankType: "start" | "kyu" | "dan"; kyu: number | null; color: string | null };

export function beltLabel(b: BeltLike): string {
  if (b.rankType === "start") return "{白帯|しろおび}（{無級|むきゅう}）";
  if (b.rankType === "dan") return "{黒帯|くろおび}（{初段|しょだん}）";
  const name = b.color ? colorName[b.color] ?? b.color : "";
  const reading = colorNameReading[name] ?? (b.color ? colorReading[b.color] : "");
  return `${b.kyu}{級|きゅう}・{${name}|${reading}}{帯|おび}`;
}

export function beltHex(color: string | null): string {
  return (color && colorHex[color]) || "#e5e7eb";
}

// "2027-02-28" → "2027{年|ねん}2{月|がつ}"
export function kidsMonth(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return `${y}{年|ねん}${m}{月|がつ}`;
}

// "2026-11-01" → "11{月|がつ}1{日|にち}"
export function kidsDay(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${m}{月|がつ}${d}{日|にち}`;
}

// 形の名前の読み（belts.json の形）
const kataReading: Record<string, string> = {
  十二の一: "じゅうにのいち",
  平安初段: "へいあんしょだん",
  平安二段: "へいあんにだん",
  平安三段: "へいあんさんだん",
  平安四段: "へいあんよんだん",
  平安五段: "へいあんごだん",
  抜塞大: "ばっさいだい",
  征遠鎮: "せいえんちん",
};

export function kataLabel(kata: string): string {
  const r = kataReading[kata];
  return r ? `{${kata}|${r}}` : kata;
}
