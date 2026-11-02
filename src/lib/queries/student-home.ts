import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { belts, developmentPlans, getDb, milestones, notes, students, themeSelections } from "@/db";

// 道場生ホームに出すもの：黒帯への道のりと現在地、今日のテーマ、次の審査
// ここには Claude の出力（下書き）を含めない。承認前のものは道場生に出さない。
export async function getStudentHome(slug: string) {
  const db = getDb();

  const [student] = await db.select().from(students).where(eq(students.slug, slug)).limit(1);
  if (!student) return null;

  const road = await db.select().from(belts).orderBy(asc(belts.order));
  const current = road.find((b) => b.id === student.beltId) ?? null;
  const next = current ? road.find((b) => b.order === current.order + 1) ?? null : null;

  // 今日のテーマ：本人が選んだ（書いた）もの。なければ最新のノートのテーマ
  const [selected] = await db
    .select({ text: themeSelections.text, forDate: themeSelections.forDate })
    .from(themeSelections)
    .where(eq(themeSelections.studentId, student.id))
    .orderBy(desc(themeSelections.forDate), desc(themeSelections.selectedAt))
    .limit(1);
  let theme: { text: string; forDate: string } | null = selected ?? null;
  if (!theme) {
    const [latest] = await db
      .select({ text: notes.theme, forDate: notes.date })
      .from(notes)
      .where(eq(notes.studentId, student.id))
      .orderBy(desc(notes.date))
      .limit(1);
    theme = latest?.text ? { text: latest.text, forDate: latest.forDate } : null;
  }

  // 次の審査：育成計画のマイルストーンのうち「審査」のもの
  const planMilestones = await db
    .select({ dueLabel: milestones.dueLabel, dueDate: milestones.dueDate })
    .from(milestones)
    .innerJoin(developmentPlans, eq(milestones.planId, developmentPlans.id))
    .where(eq(developmentPlans.studentId, student.id))
    .orderBy(asc(milestones.order));
  const today = todayInJapan();
  const nextExam = planMilestones.find((m) => m.dueLabel.includes("審査") && m.dueDate >= today) ?? null;

  return { student, road, current, next, theme, nextExam };
}

// 日本時間の今日（YYYY-MM-DD）。connection() の後に呼ぶ
function todayInJapan(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export type StudentHome = NonNullable<Awaited<ReturnType<typeof getStudentHome>>>;
