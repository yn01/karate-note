// 下書きのうち、承認したあとに届けてよい項目と、入力の上限（画面とサーバーで同じものを使う）
import type { Draft } from "@/lib/claude/schemas";

// 保護者に届く：お便り・自主練・安全。道場生に届く：次回テーマの候補。
// 要約・褒めポイント・到達基準との照合・計画見直しは先生だけが見る
export const DELIVERED_FIELDS = {
  guardian: ["guardianLetter", "homePractice", "safety"],
  student: ["themeCandidates"],
} as const;

export type GuardianView = Pick<Draft, "guardianLetter" | "homePractice" | "safety">;
export type StudentView = Pick<Draft, "themeCandidates">;

// 承認した final から、届けてよい項目だけを取り出す（保護者・道場生の画面はこれ以外で final を読まない）
export function toGuardianView(final: Draft): GuardianView {
  return { guardianLetter: final.guardianLetter, homePractice: final.homePractice, safety: final.safety };
}
export function toStudentView(final: Draft): StudentView {
  return { themeCandidates: final.themeCandidates };
}

export const LIMITS = {
  long: 600, // 要約・計画見直し
  text: 300, // お便りの各文・照合のコメント
  item: 200, // 一覧の1行・自主練のメニューと狙い
  theme: 80, // 次回テーマの1つ（読みの印を外した長さ）
  themeMarkup: 200, // 次回テーマの1つ（読みの印を含めた長さ）
  list: 6,
  letterList: 3,
  themes: 3,
  practices: 3,
} as const;
