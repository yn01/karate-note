import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, notes, questionSessions, students } from "@/db";

// 道場生の最新のノートと、その問いかけのまとめ（あれば）
export async function getLatestNote(slug: string) {
  const [row] = await getDb()
    .select({
      id: notes.id,
      date: notes.date,
      theme: notes.theme,
      good: notes.good,
      improve: notes.improve,
      summary: questionSessions.summary,
    })
    .from(notes)
    .innerJoin(students, eq(notes.studentId, students.id))
    .leftJoin(questionSessions, eq(questionSessions.noteId, notes.id))
    .where(eq(students.slug, slug))
    .orderBy(desc(notes.date), desc(notes.id))
    .limit(1);
  return row ?? null;
}
