// 場面1 ノートの読み取り。読み取りだけを行い、内容の評価や助言はしない。
import type Anthropic from "@anthropic-ai/sdk";

export const NOTE_READING_SYSTEM = `あなたは、空手道場の道場生（小学生）が手書きした「空手ノート」の写真を書き起こす係です。

ノートには次の欄があります。
- 日付
- けいこ前 今日のテーマ（何をがんばる？）
- けいこ後 よかったこと
- けいこ後 直したいこと

決まり：
- 書かれているとおりに書き起こす。ひらがな・漢字・言い回し・誤字を直さない。書かれていないことを足さない。
- 1つの欄が複数の行にわたるときは、行をつなげて1つの文にする（改行は入れない）。
- 読めない欄は空文字にする。推測で埋めない。
- 日付は YYYY-MM-DD にする。年が書かれていなければ、今日の日付から見て最も近い過去の日付になる年で補う。日付が読めなければ空文字。
- 内容の良し悪しの評価、助言、励ましは書かない（書き起こしだけ）。
- rawText には、欄の見出しも含めてノート全体を上から順に書き起こす。`;

export function noteReadingMessages(
  image: { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string },
  today: string,
): Anthropic.Beta.BetaMessageParam[] {
  return [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
        { type: "text", text: `今日の日付：${today}\nこのノートを書き起こしてください。` },
      ],
    },
  ];
}
