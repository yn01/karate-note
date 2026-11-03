// 場面3 問いかけに渡す文脈を DB と skills から組み立てる（サーバー側だけ）。
// 渡さないもの：到達基準の状態（点数）、Claude が整理した1対1のことば（承認前のため）。
import "server-only";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import { developmentPlans, getDb, milestones, notes, oneOnOnes } from "@/db";
import { loadSkill, type Skill } from "@/lib/skills";
import { todayInJapan } from "@/lib/dates";

export type QuestioningContext = {
  note: { date: string; theme: string; good: string; improve: string };
  pastNotes: { date: string; theme: string; good: string; improve: string }[];
  plan: { selfGoals: string[]; focus: string; nextMilestone: string } | null;
  coachWords: string | null; // 先生自身のことば（文字起こし）だけ
  skills: Skill[];
};

export async function buildQuestioningContext(noteId: number): Promise<QuestioningContext | null> {
  const db = getDb();
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
  if (!note) return null;

  const today = todayInJapan();
  const [pastNotes, [plan], planMilestones, [coach], skills] = await Promise.all([
    db
      .select({ date: notes.date, theme: notes.theme, good: notes.good, improve: notes.improve })
      .from(notes)
      .where(and(eq(notes.studentId, note.studentId), lt(notes.date, note.date)))
      .orderBy(desc(notes.date))
      .limit(3),
    db.select().from(developmentPlans).where(eq(developmentPlans.studentId, note.studentId)).limit(1),
    db
      .select({ dueLabel: milestones.dueLabel, dueDate: milestones.dueDate, description: milestones.description })
      .from(milestones)
      .innerJoin(developmentPlans, eq(milestones.planId, developmentPlans.id))
      .where(eq(developmentPlans.studentId, note.studentId))
      .orderBy(asc(milestones.order)),
    db
      .select({ transcript: oneOnOnes.transcript })
      .from(oneOnOnes)
      .where(and(eq(oneOnOnes.studentId, note.studentId), eq(oneOnOnes.date, note.date)))
      .orderBy(desc(oneOnOnes.createdAt))
      .limit(1),
    Promise.all([loadSkill("questioning.md"), loadSkill("kata/heian-nidan.md")]),
  ]);

  const next = planMilestones.find((m) => m.dueDate >= today) ?? planMilestones.at(-1);
  const text = (v: string | null) => v ?? "";
  return {
    note: { date: note.date, theme: text(note.theme), good: text(note.good), improve: text(note.improve) },
    pastNotes: pastNotes.map((n) => ({ date: n.date, theme: text(n.theme), good: text(n.good), improve: text(n.improve) })),
    plan: plan
      ? {
          selfGoals: plan.selfGoals,
          focus: text(plan.focus),
          nextMilestone: next ? `${next.dueLabel}：${next.description}` : "",
        }
      : null,
    coachWords: coach?.transcript ?? null,
    skills: skills.filter((s): s is Skill => s !== null),
  };
}
