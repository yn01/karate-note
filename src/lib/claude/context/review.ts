// 場面4（下書き）・場面5（点検）に渡す文脈。先生の画面だけで使う。
import "server-only";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import {
  belts,
  criteriaChecks,
  developmentPlans,
  getDb,
  milestones,
  notes,
  oneOnOnes,
  questionSessions,
  students,
  type OneOnOneOrganized,
  type QuestionTurn,
} from "@/db";
import { CRITERIA_POINTS, KATA, type CriteriaStatus } from "@/lib/criteria";
import { stripFurigana } from "@/lib/furigana";
import { loadSkill, type Skill } from "@/lib/skills";

export type ReviewContext = {
  student: { name: string; honorific: string; grade: string; belt: string; nextBelt: string | null };
  note: { id: number; date: string; theme: string; good: string; improve: string };
  pastNotes: { date: string; theme: string; good: string; improve: string }[];
  questioning: { turns: QuestionTurn[]; summary: string } | null;
  oneOnOne: { transcript: string; organized: OneOnOneOrganized | null } | null; // organized は先生が確定したものだけ
  plan: {
    selfGoals: string[];
    guardianWish: string;
    focus: string;
    strengths: string[];
    milestones: { dueLabel: string; description: string }[];
  } | null;
  criteria: { key: string; label: string; status: CriteriaStatus | null }[]; // 状態は先生が付けたもの
  skills: Skill[];
};

export async function buildReviewContext(noteId: number): Promise<ReviewContext | null> {
  const db = getDb();
  const [row] = await db
    .select({ note: notes, student: students })
    .from(notes)
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(eq(notes.id, noteId))
    .limit(1);
  if (!row) return null;
  const { note, student } = row;

  const [road, pastNotes, [qs], [oo], [plan], planMilestones, checks, skills] = await Promise.all([
    db.select().from(belts).orderBy(asc(belts.order)),
    db
      .select({ date: notes.date, theme: notes.theme, good: notes.good, improve: notes.improve })
      .from(notes)
      .where(and(eq(notes.studentId, student.id), lt(notes.date, note.date)))
      .orderBy(desc(notes.date))
      .limit(3),
    db.select().from(questionSessions).where(eq(questionSessions.noteId, note.id)).limit(1),
    db
      .select()
      .from(oneOnOnes)
      .where(and(eq(oneOnOnes.studentId, student.id), eq(oneOnOnes.date, note.date)))
      .limit(1),
    db.select().from(developmentPlans).where(eq(developmentPlans.studentId, student.id)).limit(1),
    db
      .select({ dueLabel: milestones.dueLabel, description: milestones.description })
      .from(milestones)
      .innerJoin(developmentPlans, eq(milestones.planId, developmentPlans.id))
      .where(eq(developmentPlans.studentId, student.id))
      .orderBy(asc(milestones.order)),
    db
      .select({ key: criteriaChecks.pointKey, status: criteriaChecks.status })
      .from(criteriaChecks)
      .where(and(eq(criteriaChecks.studentId, student.id), eq(criteriaChecks.kata, KATA))),
    Promise.all([loadSkill("kata/heian-nidan.md"), loadSkill("coaching.md"), loadSkill("home-practice.md")]),
  ]);

  const current = road.find((b) => b.id === student.beltId);
  const next = current ? road.find((b) => b.order === current.order + 1) : undefined;
  const t = (v: string | null) => v ?? "";
  const status = new Map(checks.map((c) => [c.key, c.status]));

  return {
    student: { name: student.name, honorific: student.honorific, grade: student.grade, belt: current?.name ?? "", nextBelt: next?.name ?? null },
    note: { id: note.id, date: note.date, theme: t(note.theme), good: t(note.good), improve: t(note.improve) },
    pastNotes: pastNotes.map((n) => ({ date: n.date, theme: t(n.theme), good: t(n.good), improve: t(n.improve) })),
    // 問いかけの質問は読み付きの書き方なので、読みを外して渡す
    questioning: qs
      ? { turns: qs.turns.map((x) => ({ ...x, text: stripFurigana(x.text) })), summary: t(qs.summary) }
      : null,
    oneOnOne: oo ? { transcript: oo.transcript, organized: oo.organizedConfirmedAt ? oo.organized : null } : null,
    plan: plan
      ? {
          selfGoals: plan.selfGoals,
          guardianWish: t(plan.guardianWish),
          focus: t(plan.focus),
          strengths: plan.strengths,
          milestones: planMilestones,
        }
      : null,
    criteria: CRITERIA_POINTS.map((p) => ({ ...p, status: status.get(p.key) ?? null })),
    skills: skills.filter((s): s is Skill => s !== null),
  };
}
