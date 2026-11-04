// 合成データ（data/seed/*.json）を DB に入れる。npm run db:seed と、スプラッシュ画面の「デモを戻す」から使う。
// 何度流しても同じ結果になる（最初に全部消して、id も 1 から振り直す）。
// neon-http はトランザクションを使えないため、途中で失敗したらもう一度流す（最初に全部消すので元に戻る）。
// claude_calls（1日の呼び出しの回数）は消さない：戻しても上限は戻らない
import { sql } from "drizzle-orm";
import beltsJson from "../../data/seed/belts.json";
import checksJson from "../../data/seed/criteria-checks.json";
import demoInputs from "../../data/seed/demo-inputs.json";
import demoResponses from "../../data/seed/demo-responses.json";
import planJson from "../../data/seed/development-plan.json";
import examsJson from "../../data/seed/exam-plans.json";
import notesJson from "../../data/seed/notes.json";
import studentsJson from "../../data/seed/students.json";
import themesJson from "../../data/seed/theme-selections.json";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schemaAll from "./schema";
import {
  belts,
  coachReviews,
  criteriaChecks,
  developmentPlans,
  examPlans,
  milestones,
  notes,
  oneOnOnes,
  questionSessions,
  students,
  themeSelections,
  type QuestionTurn,
} from "./schema";
import { draftSchema, oneOnOneSchema } from "../lib/claude/schemas";

// アプリの DB（neon-http）でも、トランザクション（neon-serverless）でも受け取れるように
// このファイルはクライアントのコードから読み込まない（scripts/seed.ts からも使うので server-only は付けない）
type SeedDb = PgDatabase<PgQueryResultHKT, typeof schemaAll>;

type NoteSource = "photo" | "sample" | "text";
type CriteriaStatus = "not_yet" | "sometimes" | "stable";

// neon-http は1文ずつ送るので、デモを戻す操作からはトランザクションの中で呼ぶ（src/app/actions.ts）
// デモの最初の状態（11月1日のノートを取りこむ前）
export async function seedAll(db: SeedDb) {
  await db.execute(
    sql`TRUNCATE ${examPlans}, ${themeSelections}, ${coachReviews}, ${questionSessions}, ${notes}, ${oneOnOnes}, ${criteriaChecks}, ${milestones}, ${developmentPlans}, ${students}, ${belts} RESTART IDENTITY CASCADE`,
  );

  // 帯：白帯（無級）→ 10級〜1級 → 黒帯（初段）
  const beltRows = [
    {
      order: 0,
      rankType: "start" as const,
      kyu: null,
      color: beltsJson.start.color,
      name: beltsJson.start.name,
      note: beltsJson.start.note,
    },
    ...beltsJson.belts.map((b, i) => ({
      order: i + 1,
      rankType: "kyu" as const,
      kyu: b.kyu,
      color: b.color,
      name: `${b.kyu}級（${b.color}帯）`,
      kata: b.kata,
      kataFile: b.kataFile,
      kumite: b.kumite,
      kihon: b.kihon,
      eligibility: b.eligibility,
    })),
    {
      order: beltsJson.belts.length + 1,
      rankType: "dan" as const,
      kyu: null,
      color: "黒色",
      name: beltsJson.goal.name,
    },
  ];
  const insertedBelts = await db.insert(belts).values(beltRows).returning();
  const beltIdByKyu = new Map(insertedBelts.filter((b) => b.kyu !== null).map((b) => [b.kyu!, b.id]));

  // 道場生
  const studentList: { slug: string; name: string; grade: string; kyu: number; honorific?: string; guardianName?: string }[] =
    studentsJson.students;
  const insertedStudents = await db
    .insert(students)
    .values(
      studentList.map((s) => {
        const beltId = beltIdByKyu.get(s.kyu);
        if (!beltId) throw new Error(`${s.kyu}級の帯が belts.json にありません`);
        return {
          slug: s.slug,
          name: s.name,
          grade: s.grade,
          beltId,
          honorific: s.honorific ?? "さん",
          guardianName: s.guardianName ?? null,
        };
      }),
    )
    .returning();
  const studentId = (slug: string) => {
    const s = insertedStudents.find((x) => x.slug === slug);
    if (!s) throw new Error(`道場生 ${slug} が students.json にありません`);
    return s.id;
  };

  // 育成計画とマイルストーン
  const [insertedPlan] = await db
    .insert(developmentPlans)
    .values({
      studentId: studentId(planJson.studentSlug),
      selfGoals: planJson.selfGoals,
      guardianWish: planJson.guardianWish,
      focus: planJson.focus,
      strengths: planJson.strengths,
    })
    .returning();
  await db.insert(milestones).values(planJson.milestones.map((m) => ({ ...m, planId: insertedPlan.id })));

  // ノート
  await db.insert(notes).values(
    notesJson.notes.map((n) => ({
      studentId: studentId(n.studentSlug),
      date: n.date,
      theme: n.theme,
      good: n.good,
      improve: n.improve,
      rawText: [n.theme, n.good, n.improve].join("\n"),
      source: n.source as NoteSource,
    })),
  );

  // 到達基準のチェック（指導者が付けたもの）
  await db.insert(criteriaChecks).values(
    checksJson.checks.map((c) => ({
      studentId: studentId(c.studentSlug),
      kata: c.kata,
      pointKey: c.pointKey,
      pointLabel: c.pointLabel,
      status: c.status as CriteriaStatus,
      checkedAt: new Date(c.checkedAt),
    })),
  );

  // 今日のテーマ
  await db.insert(themeSelections).values(
    themesJson.selections.map((t) => ({
      studentId: studentId(t.studentSlug),
      forDate: t.forDate,
      text: t.text,
      isRewritten: t.isRewritten,
      selectedAt: new Date(t.selectedAt),
    })),
  );

  // 審査予定（先生が決めたもの）
  const examList: { studentSlug: string; examMonth: string; targetKyu: number }[] = examsJson.plans;
  if (examList.length > 0)
    await db.insert(examPlans).values(
      examList.map((e) => {
        const beltId = beltIdByKyu.get(e.targetKyu);
        if (!beltId) throw new Error(`${e.targetKyu}級の帯がありません`);
        return { studentId: studentId(e.studentSlug), examMonth: e.examMonth, targetBeltId: beltId };
      }),
    );

  return {
    studentId,
    counts: {
      belts: insertedBelts.length,
      students: insertedStudents.length,
      milestones: planJson.milestones.length,
      notes: notesJson.notes.length,
      criteriaChecks: checksJson.checks.length,
      themeSelections: themesJson.selections.length,
      examPlans: examList.length,
    },
  };
}

// デモの一周したあとの状態：11月1日のノート・問いかけ・1対1のことば・先生の承認まで済んでいる。
// 届く内容は、先生が承認した final（デモの下書きのまま）だけ
export async function seedDemoDone(db: SeedDb) {
  const { studentId } = await seedAll(db);
  const sid = studentId(demoInputs.note.studentSlug);
  const n = demoInputs.note;

  const [note] = await db
    .insert(notes)
    .values({
      studentId: sid,
      date: n.date,
      theme: n.theme,
      good: n.good,
      improve: n.improve,
      rawText: demoResponses.noteReading.rawText,
      source: "sample",
    })
    .returning({ id: notes.id });

  // 問いかけの記録と、本人の言葉のまとめ
  await db.insert(questionSessions).values({
    noteId: note.id,
    turns: demoResponses.questioningTranscript as QuestionTurn[],
    // まとめは本人の最後の答え（次にためすこと）
    summary: [...demoResponses.questioningTranscript].reverse().find((t) => t.role === "student")?.text ?? "",
  });

  // 1対1のことば（先生の声のみ）と、先生が確かめた整理
  const confirmedAt = new Date(`${n.date}T12:00:00+09:00`);
  await db.insert(oneOnOnes).values({
    studentId: sid,
    date: demoInputs.oneOnOne.date,
    transcript: demoInputs.oneOnOne.transcript,
    organized: oneOnOneSchema.parse(demoResponses.oneOnOneOrganized),
    organizedConfirmedAt: confirmedAt,
  });

  // 先生が承認したもの。点検の結果は入れない（デモの点検応答は「点検できなかった」なので、
// 通ったように見せる結果を作らない。先生の画面では、承認済みで点検はまだの状態に見える）
  const draft = draftSchema.parse(demoResponses.draft);
  await db.insert(coachReviews).values({
    noteId: note.id,
    draft,
    draftUpdatedAt: confirmedAt,
    final: draft,
    status: "approved",
    approvedAt: new Date(`${n.date}T18:00:00+09:00`),
  });
}
