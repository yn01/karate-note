// 帯の表示（道場生向けはひらがな多め）
const colorKana: Record<string, string> = {
  白色: "しろ",
  水色: "みずいろ",
  黄色: "きいろ",
  緑色: "みどり",
  紫色: "むらさき",
  茶色: "ちゃいろ",
  黒色: "くろ",
};

// 帯の色（画面の丸）
const colorHex: Record<string, string> = {
  白色: "#ffffff",
  水色: "#7dd3fc",
  黄色: "#facc15",
  緑色: "#22c55e",
  紫色: "#a855f7",
  茶色: "#92400e",
  黒色: "#111827",
};

type BeltLike = { rankType: "start" | "kyu" | "dan"; kyu: number | null; color: string | null };

export function beltKidsLabel(b: BeltLike): string {
  const color = b.color ? colorKana[b.color] ?? b.color : "";
  if (b.rankType === "start") return "しろおび（むきゅう）";
  if (b.rankType === "dan") return "くろおび（しょだん）";
  return `${b.kyu}きゅう・${color}おび`;
}

export function beltHex(color: string | null): string {
  return (color && colorHex[color]) || "#e5e7eb";
}

// "2027-02-28" → "2027ねん2がつ"
export function kidsMonth(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return `${y}ねん${m}がつ`;
}

// "2026-11-01" → "11がつ1にち"
export function kidsDay(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${m}がつ${d}にち`;
}
