import "server-only";
import { todayInJapan } from "@/lib/dates";
import { asc, desc, eq } from "drizzle-orm";
import { belts, developmentPlans, examPlans, getDb, milestones, notes, students, themeSelections } from "@/db";

// 道場生ホームに出すもの：黒帯への道のりと現在地、今日のテーマ、次の審査
// ここには Claude の出力（下書き）を含めない。承認前のものは道場生に出さない。
export async function getStudentHome(slug: string) {
  const db = getDb();

  const [student] = await db.select().from(students).where(eq(students.slug, slug)).limit(1);
  if (!student) return null;

  // 公開版はサーバーと DB の地域が離れているので、残りの問い合わせは同時に投げる（往復2回）
  const [road, [selected], [latestNote], planMilestones, [examPlan]] = await Promise.all([
    db.select().from(belts).orderBy(asc(belts.order)),
    // 今日のテーマ：本人が選んだ（書いた）もの
    db
      .select({ text: themeSelections.text, forDate: themeSelections.forDate })
      .from(themeSelections)
      .where(eq(themeSelections.studentId, student.id))
      .orderBy(desc(themeSelections.forDate), desc(themeSelections.selectedAt))
      .limit(1),
    // なければ最新のノートのテーマ
    db
      .select({ text: notes.theme, forDate: notes.date })
      .from(notes)
      .where(eq(notes.studentId, student.id))
      .orderBy(desc(notes.date))
      .limit(1),
    // 次の審査：育成計画のマイルストーンのうち「審査」のもの
    db
      .select({ dueLabel: milestones.dueLabel, dueDate: milestones.dueDate })
      .from(milestones)
      .innerJoin(developmentPlans, eq(milestones.planId, developmentPlans.id))
      .where(eq(developmentPlans.studentId, student.id))
      .orderBy(asc(milestones.order)),
    // 先生が決めた審査予定
    db.select().from(examPlans).where(eq(examPlans.studentId, student.id)).limit(1),
  ]);

  const current = road.find((b) => b.id === student.beltId) ?? null;
  // つぎの目標：先生が決めた審査予定の帯。なければ次の帯
  const planned = examPlan ? (road.find((b) => b.id === examPlan.targetBeltId) ?? null) : null;
  const next = planned ?? (current ? (road.find((b) => b.order === current.order + 1) ?? null) : null);
  const theme: { text: string; forDate: string } | null =
    selected ?? (latestNote?.text ? { text: latestNote.text, forDate: latestNote.forDate } : null);

  const today = todayInJapan();
  // 次の審査：先生が決めた審査予定。なければ育成計画のマイルストーンのうち「審査」のもの
  const nextExam = examPlan
    ? { dueLabel: "審査", dueDate: examPlan.examMonth }
    : (planMilestones.find((m) => m.dueLabel.includes("審査") && m.dueDate >= today) ?? null);

  return { student, road, current, next, theme, nextExam };
}


export type StudentHome = NonNullable<Awaited<ReturnType<typeof getStudentHome>>>;
