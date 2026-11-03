import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, notes, oneOnOnes, students } from "@/db";

// 先生の画面7：道場生の最新のノートと、その日の1対1のことば（先生だけが見る）
export async function getCoachReview(slug: string) {
  const db = getDb();
  const [note] = await db
    .select({
      id: notes.id,
      studentId: notes.studentId,
      name: students.name,
      honorific: students.honorific,
      date: notes.date,
      theme: notes.theme,
      good: notes.good,
      improve: notes.improve,
    })
    .from(notes)
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(eq(students.slug, slug))
    .orderBy(desc(notes.date), desc(notes.id))
    .limit(1);
  if (!note) return null;

  const [oneOnOne] = await db
    .select()
    .from(oneOnOnes)
    .where(and(eq(oneOnOnes.studentId, note.studentId), eq(oneOnOnes.date, note.date)))
    .limit(1);

  return { note, oneOnOne: oneOnOne ?? null };
}
