"use server";
// 画面2 ノートの取り込み。画像は Claude に送るだけで、どこにも保存しない。
// 保存するのは、本人が確かめて直した欄だけ（Claude の出力をそのまま保存しない）。
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { coachReviews, getDb, notes, students } from "@/db";
import { callScene } from "@/lib/claude/call";
import { NOTE_READING_SYSTEM, noteReadingMessages } from "@/lib/claude/prompts/note-reading";
import type { NoteReading } from "@/lib/claude/schemas";
import { todayInJapan } from "@/lib/dates";

const DEMO_STUDENT = "takuya";
// 送信の上限（next.config の 4mb）より小さくして、こちらのことばで断れるようにする
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;
const SAMPLE_IMAGE = join(process.cwd(), "public", "samples", "sample-note-11-01.png");
const MAX_FIELD = 200;

type ImageType = "image/jpeg" | "image/png" | "image/webp";

export type ReadNoteResult =
  | { ok: true; reading: NoteReading; source: "claude" | "demo" }
  | { ok: false; message: string };

// 見本の画像はいつも同じなので、Claude が一度読めたら結果を使い回す（費用と上限を守る）
let sampleReading: NoteReading | undefined;

export async function readNote(formData: FormData): Promise<ReadNoteResult> {
  const kind = formData.get("kind");
  let image: { mediaType: ImageType; base64: string };

  if (kind === "sample") {
    if (sampleReading) return { ok: true, reading: sampleReading, source: "claude" };
    // 見本はサーバーにある画像を使う（送られてきたものは使わない）
    image = { mediaType: "image/png", base64: (await readFile(SAMPLE_IMAGE)).toString("base64") };
  } else if (kind === "photo") {
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: "{写真|しゃしん}が{見|み}つかりません" };
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "{写真|しゃしん}が{大|おお}きすぎます" };
    const bytes = Buffer.from(await file.arrayBuffer());
    // 申告された種類ではなく、中身の先頭で確かめる
    const mediaType = detectImageType(bytes);
    if (!mediaType) return { ok: false, message: "この{写真|しゃしん}は{読|よ}めません" };
    image = { mediaType, base64: bytes.toString("base64") };
  } else {
    return { ok: false, message: "もう{一度|いちど}{選|えら}んでね" };
  }

  const result = await callScene("noteReading", {
    system: NOTE_READING_SYSTEM,
    messages: noteReadingMessages(image, todayInJapan()),
  });
  if (kind === "sample" && result.source === "claude") sampleReading = result.data;
  return { ok: true, reading: result.data, source: result.source };
}

export type SaveNoteResult = { ok: true; date: string } | { ok: false; message: string };

export async function saveNote(formData: FormData): Promise<SaveNoteResult> {
  const date = String(formData.get("date") ?? "");
  const fields = {
    theme: clean(formData.get("theme")),
    good: clean(formData.get("good")),
    improve: clean(formData.get("improve")),
  };
  const sourceIn = formData.get("source");
  const source = sourceIn === "photo" || sourceIn === "sample" ? sourceIn : "text";

  const dateError = checkDate(date);
  if (dateError) return { ok: false, message: dateError };
  if (!fields.theme && !fields.good && !fields.improve) {
    return { ok: false, message: "どれか1つは{書|か}いてね" };
  }
  // 全文は、本人が確かめた欄から作り直す（外から送られた文章は保存しない）
  const rawText = [
    `けいこ前 今日のテーマ：${fields.theme}`,
    `けいこ後 よかったこと：${fields.good}`,
    `けいこ後 直したいこと：${fields.improve}`,
  ].join("\n");

  try {
    const db = getDb();
    const [student] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.slug, DEMO_STUDENT))
      .limit(1);
    if (!student) return { ok: false, message: "まだ{準備|じゅんび}ができていません" };

    // 先生が確かめ終わった日のノートは書きかえない（承認したときの前提がずれるため）
    const [approved] = await db
      .select({ id: coachReviews.id })
      .from(coachReviews)
      .innerJoin(notes, eq(coachReviews.noteId, notes.id))
      .where(and(eq(notes.studentId, student.id), eq(notes.date, date), eq(coachReviews.status, "approved")))
      .limit(1);
    if (approved) return { ok: false, message: "この{日|ひ}のノートは{先生|せんせい}がもう{読|よ}みました。{日付|ひづけ}を{確|たし}かめてね" };

    // 同じ日のノートは上書き（1人1日に1冊）
    await db
      .insert(notes)
      .values({ studentId: student.id, date, ...fields, rawText, source })
      .onConflictDoUpdate({ target: [notes.studentId, notes.date], set: { ...fields, rawText, source } });
  } catch (error) {
    console.error("[note] 保存に失敗しました", error);
    return { ok: false, message: "{保存|ほぞん}できませんでした。もう{一度|いちど}ためしてね" };
  }

  return { ok: true, date };
}

// 正しい暦の日付で、今日（日本時間）から1年前までの日だけを受け付ける
function checkDate(date: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return "{日付|ひづけ}を{入|い}れてね";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return "{日付|ひづけ}を{確|たし}かめてね";
  }
  const today = todayInJapan();
  const [ty, tm, td] = today.split("-").map(Number);
  const oneYearAgo = new Date(Date.UTC(ty - 1, tm - 1, td)).toISOString().slice(0, 10);
  if (date > today) return "まだ{来|き}ていない{日|ひ}は{選|えら}べません";
  if (date < oneYearAgo) return "1{年|ねん}より{前|まえ}の{日|ひ}は{選|えら}べません";
  return null;
}

function detectImageType(b: Buffer): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

function clean(value: FormDataEntryValue | null, max = MAX_FIELD): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
