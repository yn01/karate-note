"use server";
// 画面4 次のテーマを選ぶ。決めるのは本人：候補をそのまま選ぶか、自分の言葉で書きかえる
import { revalidatePath } from "next/cache";
import { getDb, themeSelections } from "@/db";
import { themeDateAfter } from "@/lib/dates";
import { plainStudentText, stripFurigana } from "@/lib/furigana";
import { getThemeChoice } from "@/lib/queries/theme-choice";
import { LIMITS } from "@/lib/review-fields";

const DEMO_STUDENT = "takuya";

export type ChooseThemeResult = { ok: true } | { ok: false; message: string };

export async function chooseTheme(input: { reviewId: number; choice: number | null; text: string }): Promise<ChooseThemeResult> {
  if (!input || typeof input !== "object") return { ok: false, message: "もう{一度|いちど}{選|えら}んでね" };

  // 候補は送られてきたものではなく、画面に出したものと同じ「いちばん新しい承認済み」のものを DB から読む
  const data = await getThemeChoice(DEMO_STUDENT);
  if (!data || data.candidates.length === 0) return { ok: false, message: "{先生|せんせい}が{準備|じゅんび}しているよ" };
  if (Number(input.reviewId) !== data.reviewId) return { ok: false, message: "{新|あたら}しい{候補|こうほ}があるよ。もう{一度|いちど}{開|ひら}いてね" };

  const text = plainStudentText(String(input.text ?? "")).trim();
  if (!text) return { ok: false, message: "テーマを{書|か}いてね" };
  if (text.length > LIMITS.theme) return { ok: false, message: `${LIMITS.theme}{字|じ}までで{書|か}いてね` };

  // 候補をそのまま選んだときは、読みの付いた候補の文を残す
  const picked = typeof input.choice === "number" && Number.isInteger(input.choice) ? data.candidates[input.choice] : undefined;
  const asIs = picked !== undefined && stripFurigana(picked).trim() === text;
  const value = { reviewId: data.reviewId, text: asIs ? picked : text, isRewritten: !asIs, selectedAt: new Date() };

  // ノートの稽古の次の稽古の日のテーマ。同じ日に選び直したら上書きする（道場生と日付で1つ）
  const forDate = themeDateAfter(data.noteDate);
  await getDb()
    .insert(themeSelections)
    .values({ ...value, studentId: data.studentId, forDate })
    .onConflictDoUpdate({ target: [themeSelections.studentId, themeSelections.forDate], set: value });

  revalidatePath("/student");
  return { ok: true };
}
