"use server";
// 画面4 次のテーマを選ぶ。決めるのは本人：候補をそのまま選ぶか、自分の言葉で書きかえる
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { coachReviews, getDb, notes, students, themeSelections } from "@/db";
import { nextPracticeDay } from "@/lib/dates";
import { stripFurigana } from "@/lib/furigana";
import { LIMITS, toStudentView } from "@/lib/review-fields";

const DEMO_STUDENT = "takuya";

export type ChooseThemeResult = { ok: true } | { ok: false; message: string };

export async function chooseTheme(input: {
  reviewId: number;
  choice: number | null;
  text: string;
}): Promise<ChooseThemeResult> {
  const reviewId = Number(input.reviewId);
  if (!Number.isInteger(reviewId))
    return { ok: false, message: "もう{一度|いちど}{選|えら}んでね" };
  const db = getDb();

  // 候補は送られてきたものではなく、DB の承認済みのものを使う
  const [row] = await db
    .select({ studentId: students.id, final: coachReviews.final })
    .from(coachReviews)
    .innerJoin(notes, eq(coachReviews.noteId, notes.id))
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(
      and(
        eq(coachReviews.id, reviewId),
        eq(students.slug, DEMO_STUDENT),
        eq(coachReviews.status, "approved"),
      ),
    )
    .limit(1);
  if (!row?.final)
    return { ok: false, message: "{先生|せんせい}が{準備|じゅんび}しているよ" };

  const candidates = toStudentView(row.final).themeCandidates;
  const text = stripFurigana(String(input.text ?? "")).trim();
  if (!text) return { ok: false, message: "テーマを{書|か}いてね" };
  if (text.length > LIMITS.theme)
    return { ok: false, message: `${LIMITS.theme}{字|じ}までで{書|か}いてね` };

  // 候補をそのまま選んだときは、読みの付いた候補の文を残す
  const picked =
    input.choice !== null && Number.isInteger(input.choice)
      ? candidates[input.choice]
      : undefined;
  const asIs = picked !== undefined && stripFurigana(picked).trim() === text;
  const value = {
    reviewId,
    text: asIs ? picked : text,
    isRewritten: !asIs,
    selectedAt: new Date(),
  };

  // 次の稽古の日のテーマ。同じ日に選び直したら上書きする
  const forDate = nextPracticeDay();
  const [existing] = await db
    .select({ id: themeSelections.id })
    .from(themeSelections)
    .where(
      and(
        eq(themeSelections.studentId, row.studentId),
        eq(themeSelections.forDate, forDate),
      ),
    )
    .limit(1);
  if (existing)
    await db
      .update(themeSelections)
      .set(value)
      .where(eq(themeSelections.id, existing.id));
  else
    await db
      .insert(themeSelections)
      .values({ ...value, studentId: row.studentId, forDate });

  revalidatePath("/student");
  return { ok: true };
}
