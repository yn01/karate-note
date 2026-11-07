import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, notes, oneOnOnes, questionSessions, students } from "@/db";

// 道場生の最新のノートと、その問いかけのまとめ（あれば）。
// fromCoach：その日に先生の1対1のことばがあるか（中身は読まない。問いかけが先生と話したことをもとにしているかを伝えるだけ）
export async function getLatestNote(slug: string) {
  const db = getDb();
  const [row] = await db
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
  if (!row) return null;
  const [coach] = await db
    .select({ id: oneOnOnes.id })
    .from(oneOnOnes)
    .innerJoin(students, eq(oneOnOnes.studentId, students.id))
    .where(and(eq(students.slug, slug), eq(oneOnOnes.date, row.date)))
    .limit(1);
  return { ...row, fromCoach: !!coach };
}
