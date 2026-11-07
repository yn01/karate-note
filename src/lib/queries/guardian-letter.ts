import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { coachReviews, getDb, notes, students } from "@/db";
import { toGuardianView, type GuardianView } from "@/lib/review-fields";

// 保護者の画面5：先生が承認したお便りだけ。承認前の下書き・点検は読まない。
// final には先生だけが見る項目（要約・照合・計画見直し）も入っているので、toGuardianView で届けてよい項目だけにして返す
export async function getGuardianLetter(slug: string, date?: string): Promise<{
  studentName: string;
  noteDate: string;
  approvedAt: string | null;
  letter: GuardianView;
} | null> {
  const [row] = await getDb()
    .select({
      name: students.name,
      honorific: students.honorific,
      noteDate: notes.date,
      approvedAt: coachReviews.approvedAt,
      final: coachReviews.final,
    })
    .from(coachReviews)
    .innerJoin(notes, eq(coachReviews.noteId, notes.id))
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(
      and(eq(students.slug, slug), eq(coachReviews.status, "approved"), ...(date ? [eq(notes.date, date)] : [])),
    )
    .orderBy(desc(notes.date), desc(coachReviews.approvedAt))
    .limit(1);
  if (!row?.final) return null;
  return {
    studentName: `${row.name}${row.honorific}`,
    noteDate: row.noteDate,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    letter: toGuardianView(row.final),
  };
}

// お便りが届いている日付（新しい順）。先生が送ったものだけ（日付だけを返す）
export async function listLetterDates(slug: string): Promise<string[]> {
  const rows = await getDb()
    .select({ date: notes.date })
    .from(coachReviews)
    .innerJoin(notes, eq(coachReviews.noteId, notes.id))
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(and(eq(students.slug, slug), eq(coachReviews.status, "approved")))
    .orderBy(desc(notes.date));
  return [...new Set(rows.map((r) => r.date))];
}
