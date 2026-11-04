// ふりがなの書き方：文字列の中に {漢字|よみ}。Claude の出力も同じ形で受け取る。
export type FuriganaPart = { text: string; reading?: string };

const PATTERN = /\{([^{}|]+)\|([^{}|]+)\}/g;
// 読みはひらがなだけ。それ以外（文章や記号）は読みとして出さない（小さな文字で別の内容を入れられないように）
const READING = /^[ぁ-ゖー]{1,20}$/u;

export function parseFurigana(source: string): FuriganaPart[] {
  const parts: FuriganaPart[] = [];
  let last = 0;
  for (const m of source.matchAll(PATTERN)) {
    if (m.index > last) parts.push({ text: source.slice(last, m.index) });
    parts.push(READING.test(m[2]) ? { text: m[1], reading: m[2] } : { text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < source.length) parts.push({ text: source.slice(last) });
  return parts;
}

// 読みを外して漢字だけ残す（入力欄・保存・ほかの場面のプロンプト用）
export function stripFurigana(source: string): string {
  return source.replace(PATTERN, "$1");
}

// 読みを外したときに max 字を超えるなら、印を壊さない位置で切る
export function clampFurigana(source: string, max: number): string {
  if (stripFurigana(source).length <= max) return source;
  let out = "";
  let shown = 0;
  let last = 0;
  for (const m of source.matchAll(PATTERN)) {
    const plain = source.slice(last, m.index);
    if (shown + plain.length >= max) return out + plain.slice(0, max - shown);
    out += plain;
    shown += plain.length;
    if (shown + m[1].length > max) return out;
    out += m[0];
    shown += m[1].length;
    last = m.index + m[0].length;
  }
  return out + source.slice(last).slice(0, max - shown);
}

// 道場生が書いた文：読みの印に使う文字を取りのぞく（自分で読みの印を作れないように）
export function plainStudentText(source: string): string {
  return source.replace(/[{}|]/g, "");
}
