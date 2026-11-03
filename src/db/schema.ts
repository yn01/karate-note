// 空手ノートのテーブル定義（plan.md「6. データ設計」）
// 道場生・保護者の画面には、指導者が承認した（status = 'approved'）ものだけを出す。
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { CheckResult, Draft, OneOnOneOrganized } from "../lib/claude/schemas";

export type { CheckResult, OneOnOneOrganized };

export const rankTypeEnum = pgEnum("rank_type", ["start", "kyu", "dan"]);
export const criteriaStatusEnum = pgEnum("criteria_status", [
  "not_yet", // まだ
  "sometimes", // ときどきできる
  "stable", // 安定してできる
]);
export const noteSourceEnum = pgEnum("note_source", ["photo", "sample", "text"]);
export const reviewStatusEnum = pgEnum("review_status", ["draft", "approved"]);

// 帯の課題（道場共通）。白帯（無級）→ 10級〜1級 → 黒帯（初段）
export const belts = pgTable("belts", {
  id: serial("id").primaryKey(),
  order: integer("order").notNull().unique(),
  rankType: rankTypeEnum("rank_type").notNull(),
  kyu: integer("kyu"),
  color: text("color"),
  name: text("name").notNull(),
  kata: text("kata"),
  kataFile: text("kata_file"),
  kumite: text("kumite"),
  kihon: text("kihon"),
  eligibility: text("eligibility"),
  note: text("note"),
});

// 道場生（すべて架空）
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  beltId: integer("belt_id")
    .notNull()
    .references(() => belts.id),
  honorific: text("honorific").notNull().default("さん"), // 呼び方（くん・さん）
  guardianName: text("guardian_name"),
});

// 育成計画（一人ひとり）
export const developmentPlans = pgTable("development_plans", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .unique() // 育成計画は1人に1つ
    .references(() => students.id, { onDelete: "cascade" }),
  selfGoals: jsonb("self_goals").$type<string[]>().notNull(),
  guardianWish: text("guardian_wish"),
  focus: text("focus"),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const milestones = pgTable(
  "milestones",
  {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => developmentPlans.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  dueLabel: text("due_label").notNull(),
  dueDate: date("due_date").notNull(),
  description: text("description").notNull(),
  },
  (t) => [uniqueIndex("milestones_plan_order").on(t.planId, t.order)],
);

// 到達基準のチェック（指導者が付ける。Claude は判定しない）
export const criteriaChecks = pgTable(
  "criteria_checks",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    kata: text("kata").notNull(),
    pointKey: text("point_key").notNull(),
    pointLabel: text("point_label").notNull(),
    status: criteriaStatusEnum("status").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("criteria_checks_student_kata_point").on(t.studentId, t.kata, t.pointKey)],
);

// 1対1のことば（音声は保存せず、文字だけ）。整理の形は Claude の出力（src/lib/claude/schemas.ts）と同じ
export const oneOnOnes = pgTable("one_on_ones", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  transcript: text("transcript").notNull(),
  organized: jsonb("organized").$type<OneOnOneOrganized>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ノート
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  theme: text("theme"), // 稽古前 今日のテーマ
  good: text("good"), // よかったこと
  improve: text("improve"), // 直したいこと
  rawText: text("raw_text"),
  source: noteSourceEnum("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 問いかけの記録
export type QuestionTurn = {
  role: "claude" | "student";
  type?: "open" | "closed";
  text: string;
  choices?: string[];
};
export const questionSessions = pgTable("question_sessions", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  turns: jsonb("turns").$type<QuestionTurn[]>().notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 指導者の確認（下書き → 点検 → 指導者が直して承認）
// ルール：道場生・保護者向けの問い合わせは src/lib/queries/ に置き、status = 'approved' で絞り、
// final から下の View 型の項目だけを取り出す（draft・checkResult・criteriaMatch は渡さない）。
// 下書きの形は Claude の出力（src/lib/claude/schemas.ts の draft）と同じ。指導者が直した後（final）も同じ形
export type ReviewContent = Draft;
// 保護者に渡してよいもの（到達基準の状態＝点数は含めない）
export type GuardianView = Pick<ReviewContent, "guardianLetter" | "homePractice" | "safety">;
// 道場生に渡してよいもの
export type StudentView = Pick<ReviewContent, "themeCandidates">;

export const coachReviews = pgTable(
  "coach_reviews",
  {
  id: serial("id").primaryKey(),
  noteId: integer("note_id")
    .notNull()
    .unique()
    .references(() => notes.id, { onDelete: "cascade" }),
  draft: jsonb("draft").$type<ReviewContent>(),
  checkResult: jsonb("check_result").$type<CheckResult>(),
  final: jsonb("final").$type<ReviewContent>(),
  status: reviewStatusEnum("status").notNull().default("draft"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 承認済みなら、直した後の内容と承認日時が必ずある
    check(
      "coach_reviews_approved_has_final",
      sql`${t.status} <> 'approved' OR (${t.final} IS NOT NULL AND ${t.approvedAt} IS NOT NULL)`,
    ),
  ],
);

// テーマの選択（承認済みの候補から選ぶ、または自分の言葉で書き直す）
export const themeSelections = pgTable("theme_selections", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  reviewId: integer("review_id").references(() => coachReviews.id, { onDelete: "set null" }),
  text: text("text").notNull(),
  isRewritten: boolean("is_rewritten").notNull().default(false),
  forDate: date("for_date").notNull(), // どの稽古の日のテーマか
  selectedAt: timestamp("selected_at", { withTimezone: true }).notNull().defaultNow(),
});

// Claude の呼び出しの記録（1日の上限を数える。プロンプトや出力の中身は残さない）
export const claudeCallOutcomeEnum = pgEnum("claude_call_outcome", [
  "ok", // Claude が答えた
  "demo_mode", // CLAUDE_MODE=demo
  "demo_nokey", // API キーがない
  "demo_limit", // 1日の上限をこえた
  "demo_error", // API の障害・時間切れ
  "demo_refusal", // 断られた
  "demo_invalid", // 出力が形に合わなかった
]);
export const claudeCalls = pgTable(
  "claude_calls",
  {
    id: serial("id").primaryKey(),
    scene: text("scene").notNull(),
    model: text("model").notNull(),
    day: date("day").notNull(), // 日本時間の日付
    outcome: claudeCallOutcomeEnum("outcome").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("claude_calls_day_outcome").on(t.day, t.outcome)],
);
