import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { belts, coachReviews, examPlans, getDb, notes, students } from "@/db";

// 先生の画面6：道場生一覧（帯・未確認・審査予定）
export async function getCoachList() {
  const db = getDb();
  const [rows, road, latestNotes, plans] = await Promise.all([
    db.select().from(students),
    db.select().from(belts).orderBy(asc(belts.order)),
    // 道場生ごとの最新のノートと、その確認の状態
    db
      .selectDistinctOn([notes.studentId], { studentId: notes.studentId, date: notes.date, status: coachReviews.status })
      .from(notes)
      .leftJoin(coachReviews, eq(coachReviews.noteId, notes.id))
      .orderBy(notes.studentId, desc(notes.date), desc(notes.id)),
    db.select().from(examPlans),
  ]);

  const beltById = new Map(road.map((b) => [b.id, b]));
  const latest = new Map(latestNotes.map((n) => [n.studentId, n]));
  const plan = new Map(plans.map((p) => [p.studentId, p]));

  const list = rows.map((s) => {
    const belt = beltById.get(s.beltId) ?? null;
    const note = latest.get(s.id);
    const p = plan.get(s.id);
    return {
      slug: s.slug,
      name: s.name,
      honorific: s.honorific,
      grade: s.grade,
      belt,
      unconfirmed: !!note && note.status !== "approved",
      latestNoteDate: note?.date ?? null,
      exam: p ? { month: p.examMonth, target: beltById.get(p.targetBeltId) ?? null } : null,
      // 審査で目指せる帯（いまの帯より上の級）
      targets: road.filter((b) => b.rankType === "kyu" && belt && b.order > belt.order).map((b) => ({ kyu: b.kyu!, name: b.name })),
    };
  });
  // 未確認を上に、そのあと級の順（級が小さいほど上の帯）
  list.sort((a, b) => Number(b.unconfirmed) - Number(a.unconfirmed) || (a.belt?.order ?? 0) - (b.belt?.order ?? 0));
  return list;
}

export type CoachListRow = Awaited<ReturnType<typeof getCoachList>>[number];
