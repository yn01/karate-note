import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { coachReviews, getDb, notes, students, themeSelections } from "@/db";
import { toStudentView } from "@/lib/review-fields";

// 画面4 次のテーマを選ぶ：先生が承認した最新のレビューの「次回テーマの候補」だけを返す。
// 下書き・点検の結果は読まない（承認前のものは道場生に出さない）
export async function getThemeChoice(slug: string) {
  const db = getDb();
  const [row] = await db
    .select({
      reviewId: coachReviews.id,
      studentId: students.id,
      noteDate: notes.date,
      final: coachReviews.final,
    })
    .from(coachReviews)
    .innerJoin(notes, eq(coachReviews.noteId, notes.id))
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(and(eq(students.slug, slug), eq(coachReviews.status, "approved")))
    .orderBy(desc(notes.date), desc(coachReviews.approvedAt))
    .limit(1);
  if (!row?.final) return null;

  // このレビューの候補から、もう選んだテーマ（選び直しのときに最初から選んでおく）
  const [chosen] = await db
    .select({
      text: themeSelections.text,
      isRewritten: themeSelections.isRewritten,
      forDate: themeSelections.forDate,
    })
    .from(themeSelections)
    .where(
      and(
        eq(themeSelections.studentId, row.studentId),
        eq(themeSelections.reviewId, row.reviewId),
      ),
    )
    .orderBy(desc(themeSelections.selectedAt))
    .limit(1);

  return {
    reviewId: row.reviewId,
    noteDate: row.noteDate,
    candidates: toStudentView(row.final).themeCandidates,
    chosen: chosen ?? null,
  };
}
