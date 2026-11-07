import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  belts,
  coachReviews,
  criteriaChecks,
  developmentPlans,
  getDb,
  milestones,
  notes,
  oneOnOnes,
  questionSessions,
  students,
} from "@/db";
import { CRITERIA_POINTS, KATA } from "@/lib/criteria";

// 先生の画面7：道場生のノート（date があればその日、なければ最新）と、その日の1対1のことば・育成計画・到達基準・下書き（先生だけが見る）
export async function getCoachReview(slug: string, date?: string) {
  const db = getDb();
  const [note] = await db
    .select({
      id: notes.id,
      studentId: notes.studentId,
      beltId: students.beltId,
      name: students.name,
      honorific: students.honorific,
      date: notes.date,
      theme: notes.theme,
      good: notes.good,
      improve: notes.improve,
    })
    .from(notes)
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(date ? and(eq(students.slug, slug), eq(notes.date, date)) : eq(students.slug, slug))
    .orderBy(desc(notes.date), desc(notes.id))
    .limit(1);
  if (!note) return null;

  const [[oneOnOne], road, [plan], planMilestones, checks, [review], [questioning]] = await Promise.all([
    db
      .select()
      .from(oneOnOnes)
      .where(and(eq(oneOnOnes.studentId, note.studentId), eq(oneOnOnes.date, note.date)))
      .limit(1),
    db.select().from(belts).orderBy(asc(belts.order)),
    db.select().from(developmentPlans).where(eq(developmentPlans.studentId, note.studentId)).limit(1),
    db
      .select({ dueLabel: milestones.dueLabel, description: milestones.description })
      .from(milestones)
      .innerJoin(developmentPlans, eq(milestones.planId, developmentPlans.id))
      .where(eq(developmentPlans.studentId, note.studentId))
      .orderBy(asc(milestones.order)),
    db
      .select({ key: criteriaChecks.pointKey, status: criteriaChecks.status })
      .from(criteriaChecks)
      .where(and(eq(criteriaChecks.studentId, note.studentId), eq(criteriaChecks.kata, KATA))),
    db.select().from(coachReviews).where(eq(coachReviews.noteId, note.id)).limit(1),
    db.select({ summary: questionSessions.summary }).from(questionSessions).where(eq(questionSessions.noteId, note.id)).limit(1),
  ]);

  const current = road.find((b) => b.id === note.beltId) ?? null;
  const next = current ? (road.find((b) => b.order === current.order + 1) ?? null) : null;
  const status = new Map(checks.map((c) => [c.key, c.status]));

  return {
    note,
    oneOnOne: oneOnOne ?? null,
    road: { current, next },
    plan: plan ? { ...plan, milestones: planMilestones } : null,
    criteria: CRITERIA_POINTS.map((p) => ({ ...p, status: status.get(p.key) ?? null })),
    review: review ?? null,
    questioningSummary: questioning?.summary ?? null,
  };
}
