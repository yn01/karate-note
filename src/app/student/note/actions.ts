"use server";
// 画面2 ノートの取り込み。画像は Claude に送るだけで、どこにも保存しない。
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { getDb, notes, students } from "@/db";
import { callScene } from "@/lib/claude/call";
import { NOTE_READING_SYSTEM, noteReadingMessages } from "@/lib/claude/prompts/note-reading";
import type { NoteReading } from "@/lib/claude/schemas";
import { todayInJapan } from "@/lib/dates";

const DEMO_STUDENT = "takuya";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const SAMPLE_IMAGE = join(process.cwd(), "public", "samples", "sample-note-11-01.png");
const MAX_FIELD = 200;

export type ReadNoteResult =
  | { ok: true; reading: NoteReading; source: "claude" | "demo" }
  | { ok: false; message: string };

export async function readNote(formData: FormData): Promise<ReadNoteResult> {
  const kind = formData.get("kind");
  let image: { mediaType: ImageType; base64: string };

  if (kind === "sample") {
    // 見本はサーバーにある画像を使う（送られてきたものは使わない）
    image = { mediaType: "image/png", base64: (await readFile(SAMPLE_IMAGE)).toString("base64") };
  } else if (kind === "photo") {
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: "しゃしんが みつからないよ" };
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "しゃしんが おおきすぎるよ" };
    if (!IMAGE_TYPES.includes(file.type as ImageType)) return { ok: false, message: "この しゃしんは よめないよ" };
    image = { mediaType: file.type as ImageType, base64: Buffer.from(await file.arrayBuffer()).toString("base64") };
  } else {
    return { ok: false, message: "もういちど えらんでね" };
  }

  const result = await callScene("noteReading", {
    system: NOTE_READING_SYSTEM,
    messages: noteReadingMessages(image, todayInJapan()),
  });
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
  const rawText = clean(formData.get("rawText"), 2000);
  const sourceIn = formData.get("source");
  const source = sourceIn === "photo" || sourceIn === "sample" ? sourceIn : "text";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { ok: false, message: "ひづけを いれてね" };
  }
  if (!fields.theme && !fields.good && !fields.improve) {
    return { ok: false, message: "どれか 1つは かいてね" };
  }

  const db = getDb();
  const [student] = await db.select({ id: students.id }).from(students).where(eq(students.slug, DEMO_STUDENT)).limit(1);
  if (!student) return { ok: false, message: "まだ じゅんびが できていないよ" };

  const values = {
    studentId: student.id,
    date,
    ...fields,
    rawText: rawText || [fields.theme, fields.good, fields.improve].join("\n"),
    source,
  } as const;
  // 同じ日のノートは上書き（1人1日に1冊）
  await db
    .insert(notes)
    .values(values)
    .onConflictDoUpdate({ target: [notes.studentId, notes.date], set: { ...fields, rawText: values.rawText, source } });

  return { ok: true, date };
}

function clean(value: FormDataEntryValue | null, max = MAX_FIELD): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
