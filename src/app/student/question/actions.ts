"use server";
// 画面3 問いかけ。問いかけは道場生に直接届くので、原則はプロンプト（src/lib/claude/prompts/questioning.ts）で守る。
import { eq } from "drizzle-orm";
import { getDb, notes, questionSessions, students, type QuestionTurn } from "@/db";
import { callScene } from "@/lib/claude/call";
import { buildQuestioningContext } from "@/lib/claude/context/questioning";
import { MAX_QUESTIONS, questioningMessages, questioningSystem } from "@/lib/claude/prompts/questioning";
import type { NextQuestion } from "@/lib/claude/schemas";

const DEMO_STUDENT = "takuya";
const MAX_TEXT = 200;

export type AskResult =
  | { ok: true; question: NextQuestion; source: "claude" | "demo" }
  | { ok: false; message: string };

export async function askNext(noteId: number, turnsIn: unknown): Promise<AskResult> {
  const turns = checkTurns(turnsIn);
  if (!turns) return { ok: false, message: "もういちど はじめから ためしてね" };
  if (!(await isDemoStudentNote(noteId))) return { ok: false, message: "ノートが みつからないよ" };

  const ctx = await buildQuestioningContext(noteId);
  if (!ctx) return { ok: false, message: "ノートが みつからないよ" };

  const asked = turns.filter((t) => t.role === "claude").length;
  const result = await callScene("questioning", {
    system: questioningSystem(ctx),
    messages: questioningMessages(ctx, turns),
    demo: { turn: asked },
  });
  // 質問の数は決めた数までにする（Claude がまとめに進まなくても）
  const question = asked >= MAX_QUESTIONS ? { ...result.data, done: true } : result.data;
  return { ok: true, question, source: result.source };
}

export type SaveQuestioningResult = { ok: true } | { ok: false; message: string };

export async function saveQuestioning(noteId: number, turnsIn: unknown, summaryIn: unknown): Promise<SaveQuestioningResult> {
  const turns = checkTurns(turnsIn);
  const summary = typeof summaryIn === "string" ? summaryIn.trim().slice(0, MAX_TEXT) : "";
  if (!turns || turns.length === 0) return { ok: false, message: "もういちど はじめから ためしてね" };
  if (!summary) return { ok: false, message: "まとめを かいてね" };
  if (!(await isDemoStudentNote(noteId))) return { ok: false, message: "ノートが みつからないよ" };

  try {
    await getDb()
      .insert(questionSessions)
      .values({ noteId, turns, summary })
      .onConflictDoUpdate({ target: questionSessions.noteId, set: { turns, summary } });
  } catch (error) {
    console.error("[question] 保存に失敗しました", error);
    return { ok: false, message: "ほぞん できなかったよ。もういちど ためしてね" };
  }
  return { ok: true };
}

// クライアントから来たやり取りを確かめる（件数・役・長さ）
function checkTurns(value: unknown): QuestionTurn[] | null {
  if (!Array.isArray(value) || value.length > MAX_QUESTIONS * 2) return null;
  const turns: QuestionTurn[] = [];
  for (const [i, t] of value.entries()) {
    if (typeof t !== "object" || t === null) return null;
    const { role, type, text, choices } = t as Record<string, unknown>;
    const expected = i % 2 === 0 ? "claude" : "student";
    if (role !== expected || typeof text !== "string" || !text.trim() || text.length > MAX_TEXT) return null;
    if (role === "claude") {
      if (type !== "open" && type !== "closed") return null;
      const list = Array.isArray(choices) ? choices.filter((c): c is string => typeof c === "string").slice(0, 4) : [];
      turns.push({ role: "claude", type, text, choices: list.map((c) => c.slice(0, 60)) });
    } else {
      turns.push({ role: "student", text: text.trim() });
    }
  }
  return turns;
}

// デモでは主役の道場生のノートだけを扱う
async function isDemoStudentNote(noteId: number): Promise<boolean> {
  if (!Number.isInteger(noteId) || noteId <= 0) return false;
  const [row] = await getDb()
    .select({ slug: students.slug })
    .from(notes)
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(eq(notes.id, noteId))
    .limit(1);
  return row?.slug === DEMO_STUDENT;
}
