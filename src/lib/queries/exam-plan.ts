import "server-only";
import { eq } from "drizzle-orm";
import { belts, examPlans, getDb, students } from "@/db";
import { todayInJapan } from "@/lib/dates";
import { examMonthLabel, isExamPlanActive } from "@/lib/exams";

// 先生が決めた審査予定を、Claude に渡す1文にする（使えないときは null）
export async function activeExamPlanText(studentId: number): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ examMonth: examPlans.examMonth, targetOrder: belts.order, targetName: belts.name, studentBeltId: students.beltId })
    .from(examPlans)
    .innerJoin(belts, eq(examPlans.targetBeltId, belts.id))
    .innerJoin(students, eq(examPlans.studentId, students.id))
    .where(eq(examPlans.studentId, studentId))
    .limit(1);
  if (!row) return null;
  const [current] = await db.select({ order: belts.order }).from(belts).where(eq(belts.id, row.studentBeltId)).limit(1);
  if (!isExamPlanActive({ examMonth: row.examMonth, targetOrder: row.targetOrder }, current?.order, todayInJapan())) return null;
  return `${examMonthLabel(row.examMonth)}の審査で${row.targetName}を目指す（先生が決めた審査予定）`;
}
