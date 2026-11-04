"use server";
// ホーム：本人の目標を直す。目標は本人のもの（先生・保護者・Claude は書きかえない）
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { developmentPlans, getDb, students } from "@/db";
import { stripFurigana } from "@/lib/furigana";
import { GOAL_LIMITS } from "@/lib/goals";

const DEMO_STUDENT = "takuya";

export type SaveGoalsResult =
  { ok: true; goals: string[] } | { ok: false; message: string };

export async function saveSelfGoals(input: string[]): Promise<SaveGoalsResult> {
  if (!Array.isArray(input))
    return { ok: false, message: "もう{一度|いちど}{書|か}いてね" };
  const goals = input
    .map((g) => stripFurigana(String(g ?? "")).trim())
    .filter(Boolean)
    .slice(0, GOAL_LIMITS.count);
  if (goals.some((g) => g.length > GOAL_LIMITS.length))
    return {
      ok: false,
      message: `1つ${GOAL_LIMITS.length}{字|じ}までで{書|か}いてね`,
    };

  const db = getDb();
  const [plan] = await db
    .select({ id: developmentPlans.id, selfGoals: developmentPlans.selfGoals })
    .from(developmentPlans)
    .innerJoin(students, eq(developmentPlans.studentId, students.id))
    .where(eq(students.slug, DEMO_STUDENT))
    .limit(1);
  if (!plan)
    return { ok: false, message: "まだ{準備|じゅんび}ができていません" };

  // 前と同じ文は、読みの付いた前の文を残す（入力欄には読みを外した文を出しているので）
  const before = new Map(plan.selfGoals.map((g) => [stripFurigana(g), g]));
  const saved = goals.map((g) => before.get(g) ?? g);
  await db
    .update(developmentPlans)
    .set({ selfGoals: saved })
    .where(eq(developmentPlans.id, plan.id));
  revalidatePath("/student");
  return { ok: true, goals: saved };
}
