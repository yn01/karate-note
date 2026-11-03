// ふりがなの書き方：文字列の中に {漢字|よみ}。Claude の出力も同じ形で受け取る。
export type FuriganaPart = { text: string; reading?: string };

const PATTERN = /\{([^{}|]+)\|([^{}|]+)\}/g;

export function parseFurigana(source: string): FuriganaPart[] {
  const parts: FuriganaPart[] = [];
  let last = 0;
  for (const m of source.matchAll(PATTERN)) {
    if (m.index > last) parts.push({ text: source.slice(last, m.index) });
    parts.push({ text: m[1], reading: m[2] });
    last = m.index + m[0].length;
  }
  if (last < source.length) parts.push({ text: source.slice(last) });
  return parts;
}

// 読みを外して漢字だけ残す（入力欄・保存・ほかの場面のプロンプト用）
export function stripFurigana(source: string): string {
  return source.replace(PATTERN, "$1");
}
