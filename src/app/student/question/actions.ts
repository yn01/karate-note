"use server";
// 画面3 問いかけ。問いかけは道場生に直接届くので、原則はプロンプト（src/lib/claude/prompts/questioning.ts）で守る。
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb, notes, questionSessions, students, type QuestionTurn } from "@/db";
import { callScene } from "@/lib/claude/call";
import { buildQuestioningContext } from "@/lib/claude/context/questioning";
import { MAX_QUESTIONS, questioningMessages, questioningSystem } from "@/lib/claude/prompts/questioning";
import type { NextQuestion } from "@/lib/claude/schemas";
import { stripFurigana } from "@/lib/furigana";

const DEMO_STUDENT = "takuya";
const MAX_ANSWER = 200;
const MAX_QUESTION = 300;

// Claude の質問には署名を付けて返す。クライアントが「問いかけ役の発言」を作れないようにする
export type SignedTurn = QuestionTurn & { sig?: string };

export type AskResult =
  | { ok: true; question: NextQuestion; turn: SignedTurn | null; source: "claude" | "demo" }
  | { ok: false; message: string };

// 体や心のつらさを書いたときは、質問を続けずに大人へつなぐ（プロンプトにも同じ決まりがある）
const DISTRESS = /いたい|痛い|けが|怪我|こわい|怖い|やめたい|いじめ|しにたい|死にたい|たたかれ|叩かれ/;
const DISTRESS_REPLY = "{教|おし}えてくれてありがとう。{先生|せんせい}やおうちの{人|ひと}に{伝|つた}えてね。";
const CLOSING = "ここまで{自分|じぶん}の{言葉|ことば}でふりかえれたね。";

export async function askNext(noteId: number, turnsIn: unknown): Promise<AskResult> {
  const turns = checkTurns(noteId, turnsIn);
  if (!turns) return { ok: false, message: "もう{一度|いちど}はじめからためしてね" };
  if (!(await isDemoStudentNote(noteId))) return { ok: false, message: "ノートが{見|み}つかりません" };

  const answers = turns.filter((t) => t.role === "student").map((t) => t.text);
  const last = answers.at(-1);
  if (last && DISTRESS.test(last)) {
    return { ok: true, question: done(DISTRESS_REPLY, ""), turn: null, source: "claude" };
  }

  const ctx = await buildQuestioningContext(noteId);
  if (!ctx) return { ok: false, message: "ノートが{見|み}つかりません" };

  const asked = turns.filter((t) => t.role === "claude").length;
  const result = await callScene("questioning", {
    system: questioningSystem(ctx),
    messages: questioningMessages(ctx, turns),
    demo: { turn: asked },
  });
  let q = normalize(result.data);

  if (answers.length === 0) {
    // まだ何も答えていないのにまとめには進まない
    if (q.done) q = { type: "open", text: q.text || "{今日|きょう}の{稽古|けいこ}で、{自分|じぶん}で{気|き}になったところはどこかな？", choices: [], done: false, summary: "" };
  } else if (asked >= MAX_QUESTIONS && !q.done) {
    // 質問の数は決めた数まで。Claude がまとめなくても、ここで終える
    q = done(CLOSING, "");
  }
  if (q.done) {
    // デモ応答や空のまとめのときは、本人の答えを並べた下書きにする（本人が言っていないことを入れない）
    const summary = result.source === "demo" || !q.summary ? answers.join("。") : q.summary;
    // まとめは入力欄に入れるので読みを外す
    return { ok: true, question: { ...q, summary: stripFurigana(summary).slice(0, MAX_ANSWER) }, turn: null, source: result.source };
  }

  const turn: QuestionTurn = { role: "claude", type: q.type, text: q.text, choices: q.choices };
  return { ok: true, question: q, turn: { ...turn, sig: sign(noteId, turns.length, turn) }, source: result.source };
}

export type SaveQuestioningResult = { ok: true } | { ok: false; message: string };

export async function saveQuestioning(noteId: number, turnsIn: unknown, summaryIn: unknown): Promise<SaveQuestioningResult> {
  const turns = checkTurns(noteId, turnsIn);
  const summary = typeof summaryIn === "string" ? summaryIn.trim().slice(0, MAX_ANSWER) : "";
  if (!turns || !turns.some((t) => t.role === "student")) return { ok: false, message: "もう{一度|いちど}はじめからためしてね" };
  if (!summary) return { ok: false, message: "まとめを{書|か}いてね" };
  if (!(await isDemoStudentNote(noteId))) return { ok: false, message: "ノートが{見|み}つかりません" };

  try {
    await getDb()
      .insert(questionSessions)
      .values({ noteId, turns, summary })
      .onConflictDoUpdate({ target: questionSessions.noteId, set: { turns, summary, updatedAt: sql`now()` } });
  } catch (error) {
    console.error("[question] 保存に失敗しました", error);
    return { ok: false, message: "{保存|ほぞん}できませんでした。もう{一度|いちど}ためしてね" };
  }
  return { ok: true };
}

function done(text: string, summary: string): NextQuestion {
  return { type: "open", text, choices: [], done: true, summary };
}

// 長さをそろえ、選択肢のない closed は open にする（画面が止まらないように）
function normalize(q: NextQuestion): NextQuestion {
  const choices = [...new Set(q.choices.map((c) => c.trim().slice(0, 60)).filter(Boolean))].slice(0, 4);
  const type = q.type === "closed" && choices.length >= 2 ? "closed" : "open";
  return { ...q, type, text: q.text.trim().slice(0, MAX_QUESTION), choices: type === "closed" ? choices : [] };
}

// クライアントから来たやり取りを確かめる（順番・署名・長さ）
function checkTurns(noteId: number, value: unknown): QuestionTurn[] | null {
  if (!Array.isArray(value) || value.length > MAX_QUESTIONS * 2) return null;
  const turns: QuestionTurn[] = [];
  for (const [i, t] of value.entries()) {
    if (typeof t !== "object" || t === null) return null;
    const { role, type, text, choices, sig } = t as Record<string, unknown>;
    if (typeof text !== "string" || !text.trim()) return null;
    if (i % 2 === 0) {
      if (role !== "claude" || (type !== "open" && type !== "closed") || text.length > MAX_QUESTION) return null;
      const list = Array.isArray(choices) ? choices.filter((c): c is string => typeof c === "string") : [];
      const turn: QuestionTurn = { role: "claude", type, text, choices: list };
      if (typeof sig !== "string" || !verify(sig, sign(noteId, i, turn))) return null;
      turns.push(turn);
    } else {
      if (role !== "student" || text.length > MAX_ANSWER) return null;
      turns.push({ role: "student", text: text.trim() });
    }
  }
  return turns;
}

function sign(noteId: number, index: number, turn: QuestionTurn): string {
  // 鍵はサーバーだけが持つ値から作る（専用の値があればそれを使う）
  const key = process.env.QUESTION_SIGNING_SECRET || process.env.DATABASE_URL || "";
  const payload = JSON.stringify([noteId, index, turn.type, turn.text, turn.choices ?? []]);
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function verify(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
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
