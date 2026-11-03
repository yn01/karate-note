"use server";
// 画面6（先生）審査予定の設定。デモのためログインなしで変えられる（README に明記）
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { belts, examPlans, getDb, students } from "@/db";
import { todayInJapan } from "@/lib/dates";
import { upcomingExamMonths } from "@/lib/exams";

export type SaveExamResult = { ok: true } | { ok: false; message: string };

export async function saveExamPlan(slugIn: unknown, monthIn: unknown, kyuIn: unknown): Promise<SaveExamResult> {
  const slug = typeof slugIn === "string" && slugIn.length <= 64 ? slugIn : "";
  const month = typeof monthIn === "string" ? monthIn : "";
  if (!slug) return { ok: false, message: "道場生が見つかりません" };
  const db = getDb();

  try {
    const [student] = await db
      .select({ id: students.id, beltOrder: belts.order })
      .from(students)
      .innerJoin(belts, eq(students.beltId, belts.id))
      .where(eq(students.slug, slug))
      .limit(1);
    if (!student) return { ok: false, message: "道場生が見つかりません" };

    if (month === "") {
      // 未定にする
      await db.delete(examPlans).where(eq(examPlans.studentId, student.id));
    } else {
      if (!upcomingExamMonths(todayInJapan()).includes(month)) return { ok: false, message: "審査の回を選び直してください" };
      const kyu = typeof kyuIn === "number" && Number.isInteger(kyuIn) ? kyuIn : NaN;
      const [target] = await db
        .select({ id: belts.id, order: belts.order })
        .from(belts)
        .where(and(eq(belts.rankType, "kyu"), eq(belts.kyu, kyu)))
        .limit(1);
      if (!target || target.order <= student.beltOrder) return { ok: false, message: "いまの帯より上の級を選んでください" };
      await db
        .insert(examPlans)
        .values({ studentId: student.id, examMonth: month, targetBeltId: target.id })
        .onConflictDoUpdate({ target: examPlans.studentId, set: { examMonth: month, targetBeltId: target.id, updatedAt: new Date() } });
    }
  } catch (error) {
    console.error("[coach] 審査予定の保存に失敗しました", error);
    return { ok: false, message: "保存できませんでした。もう一度ためしてください" };
  }
  revalidatePath("/coach");
  revalidatePath("/student");
  return { ok: true };
}
