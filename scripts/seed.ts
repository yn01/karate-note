// 合成データ（data/seed/*.json）を DB に入れる。何度流しても同じ結果になる。
// 使い方：npm run db:seed（.env.local の DATABASE_URL を使う）
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDb } from "../src/db/client";
import {
  belts,
  coachReviews,
  criteriaChecks,
  developmentPlans,
  milestones,
  notes,
  oneOnOnes,
  questionSessions,
  students,
  themeSelections,
} from "../src/db/schema";

const seedDir = join(import.meta.dirname, "..", "data", "seed");
function load<T>(file: string): T {
  return JSON.parse(readFileSync(join(seedDir, file), "utf8")) as T;
}

type BeltsJson = {
  start: { kyu: null; color: string; name: string; note: string };
  belts: {
    kyu: number;
    color: string;
    kata: string;
    kataFile: string;
    kumite: string;
    kihon: string;
    eligibility: string;
  }[];
  goal: { name: string };
};
type StudentsJson = {
  students: { slug: string; name: string; grade: string; kyu: number; guardianName?: string }[];
};
type PlanJson = {
  studentSlug: string;
  selfGoals: string[];
  guardianWish: string;
  milestones: { order: number; dueLabel: string; dueDate: string; description: string }[];
  focus: string;
  strengths: string[];
};
type NotesJson = {
  notes: {
    studentSlug: string;
    date: string;
    theme: string;
    good: string;
    improve: string;
    source: "photo" | "sample" | "text";
  }[];
};
type ChecksJson = {
  checks: {
    studentSlug: string;
    kata: string;
    pointKey: string;
    pointLabel: string;
    status: "not_yet" | "sometimes" | "stable";
    checkedAt: string;
  }[];
};
type ThemesJson = {
  selections: {
    studentSlug: string;
    forDate: string;
    text: string;
    isRewritten: boolean;
    selectedAt: string;
  }[];
};

async function main() {
  const db = createDb();

  // 依存の逆順で消す
  await db.delete(themeSelections);
  await db.delete(coachReviews);
  await db.delete(questionSessions);
  await db.delete(notes);
  await db.delete(oneOnOnes);
  await db.delete(criteriaChecks);
  await db.delete(milestones);
  await db.delete(developmentPlans);
  await db.delete(students);
  await db.delete(belts);

  // 帯：白帯（無級）→ 10級〜1級 → 黒帯（初段）
  const beltsJson = load<BeltsJson>("belts.json");
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
  const studentsJson = load<StudentsJson>("students.json");
  const insertedStudents = await db
    .insert(students)
    .values(
      studentsJson.students.map((s) => {
        const beltId = beltIdByKyu.get(s.kyu);
        if (!beltId) throw new Error(`${s.kyu}級の帯が belts.json にありません`);
        return { slug: s.slug, name: s.name, grade: s.grade, beltId, guardianName: s.guardianName ?? null };
      }),
    )
    .returning();
  const studentId = (slug: string) => {
    const s = insertedStudents.find((x) => x.slug === slug);
    if (!s) throw new Error(`道場生 ${slug} が students.json にありません`);
    return s.id;
  };

  // 育成計画とマイルストーン
  const plan = load<PlanJson>("development-plan.json");
  const [insertedPlan] = await db
    .insert(developmentPlans)
    .values({
      studentId: studentId(plan.studentSlug),
      selfGoals: plan.selfGoals,
      guardianWish: plan.guardianWish,
      focus: plan.focus,
      strengths: plan.strengths,
    })
    .returning();
  await db.insert(milestones).values(plan.milestones.map((m) => ({ ...m, planId: insertedPlan.id })));

  // ノート
  const notesJson = load<NotesJson>("notes.json");
  await db.insert(notes).values(
    notesJson.notes.map((n) => ({
      studentId: studentId(n.studentSlug),
      date: n.date,
      theme: n.theme,
      good: n.good,
      improve: n.improve,
      rawText: [n.theme, n.good, n.improve].join("\n"),
      source: n.source,
    })),
  );

  // 到達基準のチェック（指導者が付けたもの）
  const checks = load<ChecksJson>("criteria-checks.json");
  await db.insert(criteriaChecks).values(
    checks.checks.map((c) => ({
      studentId: studentId(c.studentSlug),
      kata: c.kata,
      pointKey: c.pointKey,
      pointLabel: c.pointLabel,
      status: c.status,
      checkedAt: new Date(c.checkedAt),
    })),
  );

  // 今日のテーマ
  const themes = load<ThemesJson>("theme-selections.json");
  await db.insert(themeSelections).values(
    themes.selections.map((t) => ({
      studentId: studentId(t.studentSlug),
      forDate: t.forDate,
      text: t.text,
      isRewritten: t.isRewritten,
      selectedAt: new Date(t.selectedAt),
    })),
  );

  const counts = {
    belts: insertedBelts.length,
    students: insertedStudents.length,
    milestones: plan.milestones.length,
    notes: notesJson.notes.length,
    criteriaChecks: checks.checks.length,
    themeSelections: themes.selections.length,
  };
  console.log("シード完了（架空の合成データ）", counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
