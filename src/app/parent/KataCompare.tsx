"use client";
// 保護者の画面：手本と見比べる（場面6）。形と挙動を選び、練習の写真を撮ると、
// 先生の手本の写真と並べて、先生の知見の中から「見比べるところ」を出す。出来の判定はしない。
import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import type { KataCompare as Result } from "@/lib/claude/schemas";
import { shrinkImage } from "@/lib/shrink-image";
import { compareKata } from "./actions";

export type StepOption = { no: number; label: string; point: string; modelPhoto: string | null };
export type KataOption = { slug: string; name: string; steps: StepOption[]; sample: { step: number; path: string } | null };

type Shown = {
  stepNo: number;
  practice: string;
  result: Result;
  basis: { label: string; text: string }[];
  fromDemo: boolean;
};

export function KataCompare({ katas, suggestedStep }: { katas: KataOption[]; suggestedStep?: number }) {
  const [kataSlug, setKataSlug] = useState(katas[0]?.slug ?? "");
  const kata = katas.find((k) => k.slug === kataSlug) ?? katas[0];
  const [stepNo, setStepNo] = useState(suggestedStep ?? kata?.steps[0]?.no ?? 1);
  const step = kata?.steps.find((s) => s.no === stepNo);
  const [shown, setShown] = useState<Shown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  // 手元の写真の URL（blob:）は、差し替えるときと画面を離れるときに手放す
  const blobUrl = useRef<string | null>(null);
  const releaseBlob = () => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = null;
  };
  useEffect(() => releaseBlob, []);

  if (!kata || !step) return null;
  const sampleHere = kata.sample && kata.sample.step === step.no ? kata.sample.path : null;
  // ほかの挙動の結果は並べない（待っているあいだに挙動を変えたときなど）
  const current = shown && shown.stepNo === step.no ? shown : null;

  const send = (form: FormData, preview: string) => {
    setError(null);
    setShown(null);
    form.set("kata", kata.slug);
    form.set("step", String(step.no));
    startTransition(async () => {
      try {
        const res = await compareKata(form);
        if (res.ok) {
          setShown({ stepNo: res.stepNo, practice: preview, result: res.result, basis: res.basis, fromDemo: res.source === "demo" });
        } else {
          setError(res.message);
        }
      } catch {
        setError("うまく送れませんでした。もう一度ためしてください。");
      }
    });
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await shrinkImage(file);
      releaseBlob();
      const url = URL.createObjectURL(blob);
      blobUrl.current = url;
      const form = new FormData();
      form.set("kind", "photo");
      form.set("image", blob, "practice.jpg");
      send(form, url);
    } catch {
      setError("この写真は読めませんでした。ほかの写真でためしてください。");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const onSample = () => {
    if (!sampleHere) return;
    const form = new FormData();
    form.set("kind", "sample");
    send(form, sampleHere);
  };

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-washi px-3 py-2 text-xs leading-relaxed">
        空手には、相手と向き合う「組手（くみて）」と、決められた順序で攻撃や防御を行う「形（かた）」があります。ここで見比べるのは形です。平安二段は、道場生が序盤で習う形の一つです。
      </p>
      <p className="text-sm text-muted">
        {suggestedStep
          ? "先生が、今週見てほしい挙動を選んでいます。家で練習しているところを撮ると、先生の手本と並べて、見比べるところをお伝えします（先生が書いた知見から選びます）。"
          : "家で練習している形を撮ると、先生の手本と並べて、見比べるところをお伝えします（先生が書いた知見から選びます）。"}
      </p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="space-y-1 text-sm">
          <span className="font-bold">形</span>
          <select
            value={kata.slug}
            disabled={pending}
            onChange={(e) => {
              setKataSlug(e.target.value);
              setStepNo(katas.find((k) => k.slug === e.target.value)?.steps[0]?.no ?? 1);
              setShown(null);
              setError(null);
            }}
            className="w-full rounded-lg border border-line bg-paper p-2"
          >
            {katas.map((k) => (
              <option key={k.slug} value={k.slug}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-bold">挙動</span>
          <select
            value={step.no}
            disabled={pending}
            onChange={(e) => {
              setStepNo(Number(e.target.value));
              setShown(null);
              setError(null);
            }}
            className="w-full rounded-lg border border-line bg-paper p-2"
          >
            {kata.steps.map((s) => (
              <option key={s.no} value={s.no}>
                {s.no}
                {s.no === suggestedStep ? "（先生）" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl bg-washi p-3 text-sm">
        <p className="font-bold">
          {step.no}挙動目：{step.label}
        </p>
        {step.point && <p className="mt-1">先生のポイント：{step.point}</p>}
      </div>

      {!step.modelPhoto ? (
        <p className="text-sm text-muted">この挙動の先生の手本は、準備中です。</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Photo src={step.modelPhoto} caption="先生の手本" />
            {current ? (
              <Photo src={current.practice} caption="練習の写真" />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-line p-2 text-center text-xs text-muted">
                {pending ? "見比べています…" : "練習の写真"}
              </div>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
          <button type="button" disabled={pending} onClick={() => fileInput.current?.click()} className={buttonClass.primary}>
            練習の写真を撮って見比べる
          </button>
          {sampleHere && (
            <button type="button" disabled={pending} onClick={onSample} className={buttonClass.secondary}>
              見本の写真で見比べる
            </button>
          )}
          <p className="text-xs text-muted">写真はアプリで見比べるだけで、保存しません。</p>
        </>
      )}

      {error && <p role="alert" className="rounded-lg border border-shu bg-paper p-3 text-sm font-bold text-shu">{error}</p>}

      {current && (
        <div className="space-y-3" aria-live="polite">
          {current.fromDemo && (
            <p className="rounded-lg border border-shu bg-paper p-2 text-sm font-bold text-shu">保存済みのデモ応答です。</p>
          )}
          {current.result.photoUsable ? (
            <>
              <div>
                <p className="text-sm font-bold">見比べるところ</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {current.result.lookAt.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              {current.result.cheer && (
                <div>
                  <p className="text-sm font-bold">声かけのヒント</p>
                  <p className="mt-1">{current.result.cheer}</p>
                </div>
              )}
              {current.basis.length > 0 && (
                <details className="rounded-lg border border-line p-2 text-sm">
                  <summary className="cursor-pointer font-bold">もとにした先生の知見</summary>
                  <ul className="mt-2 space-y-1">
                    {current.basis.map((b, i) => (
                      <li key={i}>
                        <span className="text-xs text-muted">{b.label}：</span>
                        {b.text}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <p>{current.result.cheer || "全身が写るように、少しはなれて撮ってください。"}</p>
          )}
          <p className="rounded-md bg-kinari px-2 py-1 text-xs text-muted">
            できた・できていないは、先生が稽古で見ます。見比べたあと、本人に「どうだった？」と聞いてみてください。
          </p>
        </div>
      )}
    </div>
  );
}

function Photo({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="space-y-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- 手元の写真（blob:）も同じ形で出すため */}
      <img src={src} alt={caption} className="aspect-[3/4] w-full rounded-xl border border-line object-cover" />
      <figcaption className="text-center text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}
