"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass, Card, Hanko } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
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
    step.name === "reading" ? "読み取っています" : step.name === "saved" ? "保存しました" : pending ? "保存しています" : "";

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
        setError("うまく送れませんでした。もう一度ためしてね");
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
      setError("この写真は読めませんでした。ほかの写真でためしてね");
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
        setError("保存できませんでした。もう一度ためしてね");
      }
    });
  };

  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        {status}
      </p>
      {error && (
        <p role="alert" className="border border-shu bg-paper p-3 text-sm font-bold text-shu">
          <F>{error}</F>
        </p>
      )}

      {step.name === "choose" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            <F>{"{稽古|けいこ}のあとに{書|か}いたノートを{取|と}りこもう。"}</F>
          </p>
          <label className={`${buttonClass.primary} cursor-pointer focus-within:ring-4 focus-within:ring-shu/40`}>
            <F>{"ノートを{撮|と}る"}</F>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
          <button type="button" onClick={onSample} className={buttonClass.secondary}>
            <F>{"{見本|みほん}のノートを{使|つか}う"}</F>
          </button>
          <button type="button" onClick={onText} className="w-full py-2 text-sm text-muted underline">
            <F>{"{自分|じぶん}で{書|か}く"}</F>
          </button>
        </div>
      )}

      {step.name === "reading" && (
        <div className="space-y-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- その場で作った画像のプレビュー */}
          <img src={step.preview} alt="送ったノート" className="mx-auto max-h-60 border border-line" />
          <p className="font-bold">
            <F>{"{読|よ}み{取|と}っています…"}</F>
          </p>
        </div>
      )}

      {step.name === "confirm" && (
        <form action={onSave} className="space-y-4">
          {step.fromDemo && (
            <p className="border border-shu bg-paper p-3 text-sm font-bold text-shu">
              <F>{"{読|よ}み{取|と}れなかったので、{見本|みほん}を{出|だ}しています。{自分|じぶん}のノートとちがったら{直|なお}してね。"}</F>
            </p>
          )}
          {step.source !== "text" && !step.fromDemo && isEmptyReading(step.reading) && (
            <p className="border border-shu bg-paper p-3 text-sm font-bold text-shu">
              <F>{"うまく{読|よ}めませんでした。{自分|じぶん}で{書|か}いてね。"}</F>
            </p>
          )}
          {step.source !== "text" && !step.fromDemo && !isEmptyReading(step.reading) && (
            <p className="text-sm text-muted">
              <F>{"{読|よ}み{取|と}りました。ちがうところがあったら{直|なお}してね。"}</F>
            </p>
          )}
          {step.preview && (
            /* eslint-disable-next-line @next/next/no-img-element -- その場で作った画像のプレビュー */
            <img src={step.preview} alt="送ったノート" className="mx-auto max-h-40 border border-line" />
          )}
          <input type="hidden" name="source" value={step.source} />
          <Field label="{日付|ひづけ}">
            <input
              type="date"
              name="date"
              required
              defaultValue={step.reading.date}
              className="w-full rounded border border-line bg-paper p-3"
            />
          </Field>
          <TextField label="{稽古|けいこ}{前|まえ}　{今日|きょう}のテーマ（{何|なに}をがんばる？）" name="theme" value={step.reading.theme} />
          <TextField label="{稽古|けいこ}{後|ご}　よかったこと" name="good" value={step.reading.good} />
          <TextField label="{稽古|けいこ}{後|ご}　{直|なお}したいこと" name="improve" value={step.reading.improve} />
          <button
            type="submit"
            disabled={pending}
            className={buttonClass.primary}
          >
            <F>{pending ? "{保存|ほぞん}しています…" : "これで{保存|ほぞん}する"}</F>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStep({ name: "choose" })}
            className="w-full py-2 text-sm text-muted underline disabled:opacity-50"
          >
            <F>{"やり{直|なお}す"}</F>
          </button>
        </form>
      )}

      {step.name === "saved" && (
        <Card className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <Hanko size={48}>{"保存"}</Hanko>
            <p ref={savedHeading} tabIndex={-1} className="font-mincho text-lg font-extrabold outline-none">
              <F>{"{保存|ほぞん}しました"}</F>
            </p>
          </div>
          <Link href="/student/question" className={buttonClass.primary}>
            <F>{"ふりかえりの{質問|しつもん}へ"}</F>
          </Link>
          <Link href="/student" className="block text-sm text-muted underline">
            <F>{"ホームに{戻|もど}る"}</F>
          </Link>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-bold text-muted">
        <F>{label}</F>
      </span>
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
        className="w-full rounded border border-line bg-paper p-3 text-lg"
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
