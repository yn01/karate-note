// 6場面の出力の形（構造化出力）。DB の jsonb の型もここから作る。
import { z } from "zod";

// 1 ノートの読み取り
export const noteReadingSchema = z.object({
  date: z.string().describe("ノートの日付。YYYY-MM-DD。年がなければ、今日をふくめて今日より後にならない、いちばん近い年で補う。読めなければ空文字"),
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

// 6 形の見比べ（保護者向け）。先生が書いた知見の中から、見比べるところを選ぶだけ。出来の判定はしない
export const kataCompareSchema = z.object({
  photoUsable: z
    .boolean()
    .describe("練習の写真で、体の形（腕・足・姿勢）が見えるなら true。全身が写っていない・暗い・空手の写真でないなら false"),
  lookAt: z
    .array(z.string())
    .describe("見比べるところ（1〜2つ）。先生の知見の中から選び、手本で何を見るかと、写真のどこを見るかを書く。写真の子どもの形がどうなっているかは書かない"),
  basis: z.array(z.string()).describe("lookAt と cheer のもとにした先生の知見の ID（入力の <item id=...> のもの）。1〜3つ"),
  cheer: z.string().describe("声かけのヒント（先生の知見の合言葉や、保護者が見るポイントから）。1文"),
});

export const sceneSchemas = {
  noteReading: noteReadingSchema,
  oneOnOne: oneOnOneSchema,
  questioning: nextQuestionSchema,
  draft: draftSchema,
  check: checkSchema,
  kataCompare: kataCompareSchema,
} as const;

export type NoteReading = z.infer<typeof noteReadingSchema>;
export type OneOnOneOrganized = z.infer<typeof oneOnOneSchema>;
export type NextQuestion = z.infer<typeof nextQuestionSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type CheckResult = z.infer<typeof checkSchema>;
export type KataCompare = z.infer<typeof kataCompareSchema>;
export type SceneOutput = { [K in keyof typeof sceneSchemas]: z.infer<(typeof sceneSchemas)[K]> };
