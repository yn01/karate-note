"use server";
// 画面7（先生）1対1のことば。このアプリには文字だけが届き、音声は届かない・保存しない
// （文字にする処理はブラウザ・OS の音声認識が行う）。
// 整理は先生の画面にだけ出す。道場生・保護者へは、先生が承認したお便り（T07）でだけ届く。
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { coachReviews, criteriaChecks, getDb, notes, oneOnOnes, students, type OneOnOneOrganized } from "@/db";
import { buildReviewContext } from "@/lib/claude/context/review";
import { checkMessages, checkSystem } from "@/lib/claude/prompts/check";
import { draftMessages, draftSystem } from "@/lib/claude/prompts/draft";
import { draftSchema, type CheckResult, type Draft } from "@/lib/claude/schemas";
import { CRITERIA_POINTS, KATA, type CriteriaStatus } from "@/lib/criteria";
import { hashDraft } from "@/lib/draft-hash";
import { LIMITS } from "@/lib/review-fields";
import { callScene } from "@/lib/claude/call";
import { ONE_ON_ONE_SYSTEM, oneOnOneMessages } from "@/lib/claude/prompts/one-on-one";
import { checkPastDate, type DateProblem } from "@/lib/dates";
import demoInputs from "../../../../data/seed/demo-inputs.json";

const DEMO_STUDENT = "takuya";
const MAX_TRANSCRIPT = 2000;
const MAX_ITEMS = 8;
const MAX_ITEM = 100;
const KEYS = ["pointers", "selfAwareness", "homework", "toGuardian"] as const;

const DATE_MESSAGE: Record<DateProblem, string> = {
  missing: "日付を入れてください",
  invalid: "日付を確かめてください",
  future: "未来の日付は選べません",
  tooOld: "1年より前の日付は選べません",
};

export type OrganizeResult =
  // organized が null のときは、整理できなかった（文字起こしだけ保存した）
  | { ok: true; id: number; organized: OneOnOneOrganized | null; source: "claude" | "demo" }
  | { ok: false; message: string };

export async function organizeOneOnOne(dateIn: unknown, transcriptIn: unknown): Promise<OrganizeResult> {
  const date = typeof dateIn === "string" ? dateIn : "";
  const transcript = typeof transcriptIn === "string" ? transcriptIn.trim() : "";
  const dateError = checkPastDate(date);
  if (dateError) return { ok: false, message: DATE_MESSAGE[dateError] };
  if (!transcript) return { ok: false, message: "ことばを入れてください" };
  if (transcript.length > MAX_TRANSCRIPT) return { ok: false, message: `${MAX_TRANSCRIPT}字までにしてください` };

  const studentId = await demoStudentId();
  if (!studentId) return { ok: false, message: "まだ準備ができていません" };

  const result = await callScene("oneOnOne", { system: ONE_ON_ONE_SYSTEM, messages: oneOnOneMessages(transcript) });
  // デモ応答は見本のことばの整理なので、ほかのことばには使わない（話していないことを下書きにしない）
  const usable = result.source === "claude" || transcript === demoInputs.oneOnOne.transcript.trim();
  const organized = usable ? (cleanOrganized(result.data) ?? emptyOrganized()) : null;

  try {
    // 文字起こしと整理（下書き）を保存。同じ日はもう一度整理したら上書きし、確定は取り消す
    const [row] = await getDb()
      .insert(oneOnOnes)
      .values({ studentId, date, transcript, organized })
      .onConflictDoUpdate({
        target: [oneOnOnes.studentId, oneOnOnes.date],
        set: { transcript, organized, organizedConfirmedAt: null },
      })
      .returning({ id: oneOnOnes.id });
    return { ok: true, id: row.id, organized, source: result.source };
  } catch (error) {
    console.error("[one-on-one] 保存に失敗しました", error);
    return { ok: false, message: "保存できませんでした。もう一度ためしてください" };
  }
}

export type ConfirmResult = { ok: true } | { ok: false; message: string };

// 先生が直した整理を確定する（画面の日付の記録だけ）
export async function confirmOneOnOne(idIn: unknown, dateIn: unknown, organizedIn: unknown): Promise<ConfirmResult> {
  const id = typeof idIn === "number" && Number.isInteger(idIn) && idIn > 0 ? idIn : 0;
  const date = typeof dateIn === "string" ? dateIn : "";
  const organized = cleanOrganized(organizedIn);
  if (!id || !organized || checkPastDate(date)) return { ok: false, message: "もう一度整理からやり直してください" };

  const studentId = await demoStudentId();
  if (!studentId) return { ok: false, message: "まだ準備ができていません" };
  try {
    const updated = await getDb()
      .update(oneOnOnes)
      .set({ organized, organizedConfirmedAt: sql`now()` })
      .where(and(eq(oneOnOnes.id, id), eq(oneOnOnes.studentId, studentId), eq(oneOnOnes.date, date)))
      .returning({ id: oneOnOnes.id });
    if (updated.length === 0) return { ok: false, message: "見つかりませんでした。もう一度整理からやり直してください" };
  } catch (error) {
    console.error("[one-on-one] 確定に失敗しました", error);
    return { ok: false, message: "保存できませんでした。もう一度ためしてください" };
  }
  return { ok: true };
}

// 4つの欄だけ・文字列だけ・行数と長さを確かめる（空の行は落とす）
function cleanOrganized(value: unknown): OneOnOneOrganized | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const out = emptyOrganized();
  for (const k of KEYS) {
    const list = v[k];
    if (!Array.isArray(list)) return null;
    out[k] = list
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim().slice(0, MAX_ITEM))
      .filter(Boolean)
      .slice(0, MAX_ITEMS);
  }
  return out;
}

function emptyOrganized(): OneOnOneOrganized {
  return { pointers: [], selfAwareness: [], homework: [], toGuardian: [] };
}

async function demoStudentId(): Promise<number | null> {
  const [s] = await getDb().select({ id: students.id }).from(students).where(eq(students.slug, DEMO_STUDENT)).limit(1);
  return s?.id ?? null;
}

export type ClearResult = { ok: true } | { ok: false; message: string };

// その日の1対1の記録（文字起こしと整理）を消して、やり直せるようにする
export async function clearOneOnOne(dateIn: unknown): Promise<ClearResult> {
  const date = typeof dateIn === "string" ? dateIn : "";
  if (checkPastDate(date)) return { ok: false, message: "日付を確かめてください" };
  const studentId = await demoStudentId();
  if (!studentId) return { ok: false, message: "まだ準備ができていません" };
  try {
    await getDb()
      .delete(oneOnOnes)
      .where(and(eq(oneOnOnes.studentId, studentId), eq(oneOnOnes.date, date)));
  } catch (error) {
    console.error("[one-on-one] 消すのに失敗しました", error);
    return { ok: false, message: "消せませんでした。もう一度ためしてください" };
  }
  return { ok: true };
}


// ---- 到達基準のチェック（先生が付ける） ----

const STATUSES: CriteriaStatus[] = ["not_yet", "sometimes", "stable"];

export type SaveCriteriaResult = { ok: true } | { ok: false; message: string };

// 要点ごとの状態をまとめて保存する。「（未）」は消す
export async function saveCriteria(valuesIn: unknown): Promise<SaveCriteriaResult> {
  if (typeof valuesIn !== "object" || valuesIn === null) return { ok: false, message: "もう一度ためしてください" };
  const values = valuesIn as Record<string, unknown>;
  const studentId = await demoStudentId();
  if (!studentId) return { ok: false, message: "まだ準備ができていません" };
  const set = CRITERIA_POINTS.flatMap((p) => {
    const v = values[p.key];
    return typeof v === "string" && STATUSES.includes(v as CriteriaStatus)
      ? [{ studentId, kata: KATA, pointKey: p.key, pointLabel: p.label, status: v as CriteriaStatus }]
      : [];
  });
  const cleared = CRITERIA_POINTS.filter((p) => values[p.key] === "").map((p) => p.key);
  try {
    if (set.length > 0) {
      await getDb()
        .insert(criteriaChecks)
        .values(set)
        .onConflictDoUpdate({
          target: [criteriaChecks.studentId, criteriaChecks.kata, criteriaChecks.pointKey],
          set: { status: sql`excluded.status`, pointLabel: sql`excluded.point_label`, checkedAt: sql`now()` },
        });
    }
    if (cleared.length > 0) {
      await getDb()
        .delete(criteriaChecks)
        .where(
          and(eq(criteriaChecks.studentId, studentId), eq(criteriaChecks.kata, KATA), inArray(criteriaChecks.pointKey, cleared)),
        );
    }
  } catch (error) {
    console.error("[review] 到達基準の保存に失敗しました", error);
    return { ok: false, message: "保存できませんでした。もう一度ためしてください" };
  }
  revalidatePath("/coach/review");
  return { ok: true };
}

// ---- 下書き（場面4）・点検（場面5）・承認 ----

const DEMO_NOTE_DATE = "2026-11-01"; // デモ応答（保存済みの下書き）は、この日の見本ノートのためのもの

export type DraftResult =
  | { ok: true; draft: Draft; source: "claude" | "demo"; usable: boolean }
  | { ok: false; message: string };

export async function generateDraft(noteIdIn: unknown): Promise<DraftResult> {
  const noteId = await ownNoteId(noteIdIn);
  if (!noteId) return { ok: false, message: "ノートが見つかりません" };
  const ctx = await buildReviewContext(noteId);
  if (!ctx) return { ok: false, message: "ノートが見つかりません" };

  const result = await callScene("draft", { system: draftSystem(ctx), messages: draftMessages(ctx) });
  // デモ応答は見本ノートの下書きなので、ほかのノートには使わない
  const usable = result.source === "claude" || ctx.note.date === DEMO_NOTE_DATE;
  if (!usable) {
    // 作れなかったときは保存しない（前の下書きと点検を消さない）。画面には空の下書きを出して、先生が手で書ける
    return { ok: true, draft: emptyDraft(), source: result.source, usable: false };
  }
  const draft = clampDraft(result.data);
  try {
    await getDb()
      .insert(coachReviews)
      .values({ noteId, draft, checkResult: null, checkHash: null, draftUpdatedAt: sql`now()` })
      // 承認済みなら final と status はそのまま（届いている内容は変えない）。下書きと点検だけ新しくする
      .onConflictDoUpdate({
        target: coachReviews.noteId,
        set: { draft, checkResult: null, checkHash: null, draftUpdatedAt: sql`now()` },
      });
  } catch (error) {
    console.error("[review] 下書きの保存に失敗しました", error);
    return { ok: false, message: "保存できませんでした。もう一度ためしてください" };
  }
  return { ok: true, draft, source: result.source, usable: true };
}

export type CheckRunResult =
  | { ok: true; check: CheckResult; source: "claude" | "demo"; hash: string }
  | { ok: false; message: string };

// 先生が画面で直している途中の下書きを点検する。点検した内容のハッシュを残し、承認のときに同じかを確かめる
export async function runCheck(noteIdIn: unknown, draftIn: unknown): Promise<CheckRunResult> {
  const noteId = await ownNoteId(noteIdIn);
  const parsed = draftSchema.safeParse(draftIn);
  if (!noteId || !parsed.success) return { ok: false, message: "もう一度下書きを作ってください" };
  const draft = clampDraft(parsed.data);
  const hash = hashDraft(draft);

  // 同じ内容をもう点検していれば、その結果を返す（費用と上限を守る）
  const [saved] = await getDb()
    .select({ checkResult: coachReviews.checkResult, checkHash: coachReviews.checkHash })
    .from(coachReviews)
    .where(eq(coachReviews.noteId, noteId))
    .limit(1);
  if (saved?.checkResult && saved.checkHash === hash) return { ok: true, check: saved.checkResult, source: "claude", hash };

  const ctx = await buildReviewContext(noteId);
  if (!ctx) return { ok: false, message: "ノートが見つかりません" };
  const result = await callScene("check", { system: checkSystem(ctx), messages: checkMessages(ctx, draft) });
  try {
    // デモ応答の点検は「点検できなかった」なので、点検した内容としては残さない
    await getDb()
      .update(coachReviews)
      .set({ checkResult: result.data, checkHash: result.source === "claude" ? hash : null })
      .where(eq(coachReviews.noteId, noteId));
  } catch (error) {
    console.error("[review] 点検の保存に失敗しました", error);
  }
  return { ok: true, check: result.data, source: result.source, hash };
}

export type ApproveResult =
  | { ok: true; approvedAt: string; final: Draft }
  | { ok: false; message: string; needsConfirm?: boolean };

// 先生が直した内容で承認する。承認したものだけが保護者・道場生に届く。
// 点検していない・点検のあとに直した・指摘が残っているときは、止めずに先生に確かめる（決めるのは先生）
export async function approveReview(noteIdIn: unknown, finalIn: unknown, confirmed: unknown): Promise<ApproveResult> {
  const noteId = await ownNoteId(noteIdIn);
  const parsed = draftSchema.safeParse(finalIn);
  if (!noteId || !parsed.success) return { ok: false, message: "内容を確かめてください" };
  const final = clampDraft(parsed.data);
  if (!final.guardianLetter.coachWords && final.themeCandidates.length === 0) {
    return { ok: false, message: "お便りか次回テーマを書いてから承認してください" };
  }

  if (confirmed !== true) {
    const [saved] = await getDb()
      .select({ checkResult: coachReviews.checkResult, checkHash: coachReviews.checkHash })
      .from(coachReviews)
      .where(eq(coachReviews.noteId, noteId))
      .limit(1);
    const checkedThis = saved?.checkHash === hashDraft(final);
    if (!saved?.checkResult || !saved.checkHash) {
      return { ok: false, needsConfirm: true, message: "まだ点検していません（または点検できませんでした）。このまま承認しますか？" };
    }
    if (!checkedThis) {
      return { ok: false, needsConfirm: true, message: "点検のあとに内容を直しています。もう一度点検せずに承認しますか？" };
    }
    if (saved.checkResult.issues.length > 0) {
      return {
        ok: false,
        needsConfirm: true,
        message: `点検の指摘が${saved.checkResult.issues.length}件あります。確かめたうえで承認しますか？`,
      };
    }
  }

  try {
    const [row] = await getDb()
      .insert(coachReviews)
      .values({ noteId, final, status: "approved", approvedAt: sql`now()` })
      .onConflictDoUpdate({ target: coachReviews.noteId, set: { final, status: "approved", approvedAt: sql`now()` } })
      .returning({ approvedAt: coachReviews.approvedAt });
    revalidatePath("/coach/review");
    return { ok: true, approvedAt: row.approvedAt?.toISOString() ?? new Date().toISOString(), final };
  } catch (error) {
    console.error("[review] 承認に失敗しました", error);
    return { ok: false, message: "保存できませんでした。もう一度ためしてください" };
  }
}

async function ownNoteId(value: unknown): Promise<number | null> {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  const [row] = await getDb()
    .select({ id: notes.id })
    .from(notes)
    .innerJoin(students, eq(notes.studentId, students.id))
    .where(and(eq(notes.id, value), eq(students.slug, DEMO_STUDENT)))
    .limit(1);
  return row?.id ?? null;
}

// 長さと数の上限をそろえる（画面と同じ LIMITS）。照合は要点の一覧を軸に組み立てる
function clampDraft(d: Draft): Draft {
  const str = (s: string, n: number) => s.trim().slice(0, n);
  const list = (xs: string[], n: number, m: number) => xs.map((x) => str(x, m)).filter(Boolean).slice(0, n);
  const comments = new Map(d.criteriaMatch.map((c) => [c.pointKey, c.comment]));
  return {
    summary: str(d.summary, LIMITS.long),
    praise: list(d.praise, LIMITS.list, LIMITS.item),
    criteriaMatch: CRITERIA_POINTS.map((p) => ({ pointKey: p.key, pointLabel: p.label, comment: str(comments.get(p.key) ?? "", LIMITS.text) })),
    themeCandidates: list(d.themeCandidates, LIMITS.themes, LIMITS.theme),
    homePractice: d.homePractice
      .map((h) => ({ menu: str(h.menu, LIMITS.item), aim: str(h.aim, LIMITS.item) }))
      .filter((h) => h.menu)
      .slice(0, LIMITS.practices),
    safety: list(d.safety, LIMITS.list, LIMITS.item),
    planRevision: str(d.planRevision, LIMITS.long),
    guardianLetter: {
      coachWords: str(d.guardianLetter.coachWords, LIMITS.text),
      watchPoints: list(d.guardianLetter.watchPoints, LIMITS.letterList, LIMITS.item),
      cheerHints: list(d.guardianLetter.cheerHints, LIMITS.letterList, LIMITS.item),
      effort: str(d.guardianLetter.effort, LIMITS.text),
      model: str(d.guardianLetter.model, LIMITS.text),
    },
  };
}

function emptyDraft(): Draft {
  return {
    summary: "",
    praise: [],
    criteriaMatch: CRITERIA_POINTS.map((p) => ({ pointKey: p.key, pointLabel: p.label, comment: "" })),
    themeCandidates: [],
    homePractice: [],
    safety: [],
    planRevision: "",
    guardianLetter: { coachWords: "", watchPoints: [], cheerHints: [], effort: "", model: "" },
  };
}
