"use server";
// 画面7（先生）1対1のことば。このアプリには文字だけが届き、音声は届かない・保存しない
// （文字にする処理はブラウザ・OS の音声認識が行う）。
// 整理は先生の画面にだけ出す。道場生・保護者へは、先生が承認したお便り（T07）でだけ届く。
import { and, eq, sql } from "drizzle-orm";
import { getDb, oneOnOnes, students, type OneOnOneOrganized } from "@/db";
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
