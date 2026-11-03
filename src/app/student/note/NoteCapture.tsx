"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { NoteReading } from "@/lib/claude/schemas";
import { todayInJapan } from "@/lib/dates";
import { readNote, saveNote } from "./actions";

type Source = "photo" | "sample" | "text";
type Step =
  | { name: "choose" }
  | { name: "reading"; preview: string }
  | { name: "confirm"; source: Source; reading: NoteReading; fromDemo: boolean; preview?: string }
  | { name: "saved"; date: string };

const SAMPLE_PREVIEW = "/samples/sample-note-11-01.png";

const emptyReading = (today: string): NoteReading => ({ date: today, theme: "", good: "", improve: "", rawText: "" });

// 画面2：えらぶ → よみとり → たしかめる → ほぞん
export function NoteCapture() {
  const [step, setStep] = useState<Step>({ name: "choose" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const savedHeading = useRef<HTMLParagraphElement>(null);

  // その場で作ったプレビュー（object URL）は、使い終わったら手放す
  const preview = step.name === "reading" || step.name === "confirm" ? step.preview : undefined;
  useEffect(() => {
    if (!preview || preview === SAMPLE_PREVIEW) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (step.name === "saved") savedHeading.current?.focus();
  }, [step.name]);

  // 状態を知らせる文（読み上げ用に、いつも置いておく）
  const status =
    step.name === "reading" ? "よみとって いるよ" : step.name === "saved" ? "ほぞん したよ" : pending ? "ほぞん しているよ" : "";

  const read = (form: FormData, preview: string, source: Source) => {
    setError(null);
    setStep({ name: "reading", preview });
    startTransition(async () => {
      try {
        const result = await readNote(form);
        if (!result.ok) {
          setError(result.message);
          setStep({ name: "choose" });
          return;
        }
        setStep({
          name: "confirm",
          source,
          reading: fitReading(result.reading),
          fromDemo: result.source === "demo",
          preview,
        });
      } catch {
        setError("うまく おくれなかったよ。もういちど ためしてね");
        setStep({ name: "choose" });
      }
    });
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await shrinkImage(file);
      const form = new FormData();
      form.set("kind", "photo");
      form.set("image", blob, "note.jpg");
      read(form, URL.createObjectURL(blob), "photo");
    } catch {
      setError("この しゃしんは よめないよ。ほかの しゃしんで ためしてね");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const onSample = () => {
    const form = new FormData();
    form.set("kind", "sample");
    read(form, SAMPLE_PREVIEW, "sample");
  };

  const onText = () => {
    setError(null);
    setStep({ name: "confirm", source: "text", reading: emptyReading(todayInJapan()), fromDemo: false });
  };

  const onSave = (form: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveNote(form);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setStep({ name: "saved", date: result.date });
      } catch {
        setError("ほぞん できなかったよ。もういちど ためしてね");
      }
    });
  };

  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        {status}
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {step.name === "choose" && (
        <div className="space-y-3">
          <p className="text-sm text-ink/80">けいこの あとに かいた ノートを とりこもう。</p>
          <label className="block w-full cursor-pointer rounded-2xl bg-ink py-4 text-center text-lg font-bold text-white focus-within:ring-4 focus-within:ring-amber-300">
            📷 ノートを とる
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            onClick={onSample}
            className="w-full rounded-2xl border-2 border-ink bg-white py-4 text-lg font-bold"
          >
            みほんの ノートを つかう
          </button>
          <button type="button" onClick={onText} className="w-full py-2 text-sm text-ink/70 underline">
            じぶんで かく
          </button>
        </div>
      )}

      {step.name === "reading" && (
        <div className="space-y-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- その場で作った画像のプレビュー */}
          <img src={step.preview} alt="おくった ノート" className="mx-auto max-h-60 rounded-xl shadow" />
          <p className="font-bold">よみとって いるよ…</p>
        </div>
      )}

      {step.name === "confirm" && (
        <form action={onSave} className="space-y-4">
          {step.fromDemo && (
            <p className="rounded-xl bg-amber-100 p-3 text-sm font-bold">
              よみとれなかったので、みほんを だしているよ。じぶんの ノートと ちがったら なおしてね。
            </p>
          )}
          {step.source !== "text" && !step.fromDemo && isEmptyReading(step.reading) && (
            <p className="rounded-xl bg-amber-100 p-3 text-sm font-bold">
              うまく よめなかったよ。じぶんで かいてね。
            </p>
          )}
          {step.source !== "text" && !step.fromDemo && !isEmptyReading(step.reading) && (
            <p className="text-sm text-ink/80">よみとったよ。ちがう ところが あったら なおしてね。</p>
          )}
          {step.preview && (
            /* eslint-disable-next-line @next/next/no-img-element -- その場で作った画像のプレビュー */
            <img src={step.preview} alt="おくった ノート" className="mx-auto max-h-40 rounded-xl shadow" />
          )}
          <input type="hidden" name="source" value={step.source} />
          <Field label="ひづけ">
            <input
              type="date"
              name="date"
              required
              defaultValue={step.reading.date}
              className="w-full rounded-xl border border-ink/30 bg-white p-3"
            />
          </Field>
          <TextField label="きょうの テーマ（なにを がんばる？）" name="theme" value={step.reading.theme} />
          <TextField label="よかったこと" name="good" value={step.reading.good} />
          <TextField label="なおしたいこと" name="improve" value={step.reading.improve} />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-ink py-4 text-lg font-bold text-white disabled:opacity-50"
          >
            {pending ? "ほぞん しているよ…" : "これで ほぞんする"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStep({ name: "choose" })}
            className="w-full py-2 text-sm text-ink/70 underline disabled:opacity-50"
          >
            やりなおす
          </button>
        </form>
      )}

      {step.name === "saved" && (
        <div className="space-y-4 rounded-2xl bg-white p-5 text-center shadow-sm">
          <p ref={savedHeading} tabIndex={-1} className="text-lg font-bold outline-none">
            ほぞん したよ！
          </p>
          <Link
            href="/student/question"
            className="block w-full rounded-2xl bg-ink py-4 text-lg font-bold text-white"
          >
            ふりかえりの しつもんへ
          </Link>
          <Link href="/student" className="block text-sm text-ink/70 underline">
            ホームに もどる
          </Link>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-bold text-ink/80">{label}</span>
      {children}
    </label>
  );
}

function TextField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <Field label={label}>
      <textarea
        name={name}
        defaultValue={value}
        rows={2}
        maxLength={200}
        className="w-full rounded-xl border border-ink/30 bg-white p-3 text-lg"
      />
    </Field>
  );
}

const MAX_FIELD = 200;
const MAX_UPLOAD = 3.4 * 1024 * 1024; // サーバーの上限（3.5MB）より少し小さく

const isEmptyReading = (r: NoteReading) => !r.theme && !r.good && !r.improve;

// 入力欄の文字数（200字）に合わせる
const fitReading = (r: NoteReading): NoteReading => ({
  ...r,
  theme: r.theme.slice(0, MAX_FIELD),
  good: r.good.slice(0, MAX_FIELD),
  improve: r.improve.slice(0, MAX_FIELD),
});

// 写真を長辺 1600px の JPEG に縮める（iPhone の写真は数MBあるため）。大きければ品質を下げる
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  try {
    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", quality),
      );
      if (blob.size <= MAX_UPLOAD) return blob;
    }
    throw new Error("too large");
  } finally {
    // Safari のキャンバスのメモリを早く手放す
    canvas.width = 0;
    canvas.height = 0;
  }
}
