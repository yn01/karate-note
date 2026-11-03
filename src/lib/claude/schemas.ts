// 5場面の出力の形（構造化出力）。DB の jsonb の型もここから作る。
import { z } from "zod";

// 1 ノートの読み取り
export const noteReadingSchema = z.object({
  date: z.string().describe("ノートの日付。YYYY-MM-DD。年が書かれていなければ稽古の年で補う。読めなければ空文字"),
  theme: z.string().describe("けいこ前 今日のテーマ（書かれたまま）"),
  good: z.string().describe("けいこ後 よかったこと（書かれたまま）"),
  improve: z.string().describe("けいこ後 直したいこと（書かれたまま）"),
  rawText: z.string().describe("ノート全体の書き起こし"),
});

// 2 1対1のことばの整理
export const oneOnOneSchema = z.object({
  pointers: z.array(z.string()).describe("指導者の指摘"),
  selfAwareness: z.array(z.string()).describe("本人の気づき"),
  homework: z.array(z.string()).describe("来週の宿題"),
  toGuardian: z.array(z.string()).describe("保護者に伝えたいこと"),
});

// 3 問いかけ（次の1問）
export const nextQuestionSchema = z.object({
  type: z.enum(["open", "closed"]).describe("open＝オープン質問、closed＝選択肢のあるクローズド質問"),
  text: z.string().describe("道場生への質問。答えは教えない"),
  choices: z.array(z.string()).describe("closed のときの選択肢（open のときは空配列）"),
  done: z.boolean().describe("問いかけを終えてまとめに進むなら true"),
  summary: z.string().describe("done が true のときの、本人のことばによるまとめ（それ以外は空文字）"),
});

// 4 下書き（指導者が直して承認するまで道場生・保護者には届かない）
export const draftSchema = z.object({
  summary: z.string(),
  praise: z.array(z.string()),
  // 到達基準の状態（まだ／ときどき／安定）は指導者が付けたもの（criteria_checks）をサーバー側で結合する。
  // Claude は状態を判定せず、ノートや1対1のことばとの照らし合わせ（comment）だけを書く。
  criteriaMatch: z.array(
    z.object({
      pointKey: z.string().describe("到達基準の要点のキー（入力で渡したものをそのまま）"),
      pointLabel: z.string(),
      comment: z.string().describe("ノート・問いかけ・先生のことばとの照らし合わせ。出来の判定はしない"),
    }),
  ),
  themeCandidates: z.array(z.string()),
  homePractice: z.array(z.object({ menu: z.string(), aim: z.string() })),
  safety: z.array(z.string()),
  planRevision: z.string(),
  guardianLetter: z.object({
    coachWords: z.string(),
    watchPoints: z.array(z.string()),
    cheerHints: z.array(z.string()),
    effort: z.string(),
    model: z.string(),
  }),
});

// 5 点検
export const checkSchema = z.object({
  ok: z.boolean(),
  issues: z.array(
    z.object({
      kind: z.string().describe("答えを教えている／安全／子どもに伝わらない／育成計画や形の知見とずれ など"),
      message: z.string(),
      suggestion: z.string(),
    }),
  ),
});

export const sceneSchemas = {
  noteReading: noteReadingSchema,
  oneOnOne: oneOnOneSchema,
  questioning: nextQuestionSchema,
  draft: draftSchema,
  check: checkSchema,
} as const;

export type NoteReading = z.infer<typeof noteReadingSchema>;
export type OneOnOneOrganized = z.infer<typeof oneOnOneSchema>;
export type NextQuestion = z.infer<typeof nextQuestionSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type CheckResult = z.infer<typeof checkSchema>;
export type SceneOutput = { [K in keyof typeof sceneSchemas]: z.infer<(typeof sceneSchemas)[K]> };
