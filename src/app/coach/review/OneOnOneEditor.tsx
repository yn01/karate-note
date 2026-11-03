"use client";

import { useRef, useState, useTransition } from "react";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { VoiceInput } from "@/components/voice/VoiceInput";
import type { OneOnOneOrganized } from "@/db";
import { confirmOneOnOne, organizeOneOnOne } from "./actions";

type Props = {
  date: string; // ノートの日（この画面ではノートの日の1対1だけを扱う）
  sampleTranscript: string;
  saved: { id: number; transcript: string; organized: OneOnOneOrganized | null; confirmed: boolean } | null;
};

const MAX_TRANSCRIPT = 2000;
const SECTIONS: { key: keyof OneOnOneOrganized; label: string }[] = [
  { key: "pointers", label: "指摘" },
  { key: "selfAwareness", label: "本人の気づき" },
  { key: "homework", label: "来週の宿題" },
  { key: "toGuardian", label: "保護者に伝えたいこと" },
];

// 音声入力の文をつなぐ（句点がなければ足す）
function join(cur: string, add: string): string {
  const t = add.trim();
  if (!t) return cur;
  const next = cur && !/[。！？!?\n]$/.test(cur) ? `${cur}。${t}` : `${cur}${t}`;
  return next.slice(0, MAX_TRANSCRIPT);
}

// 画面7の一部：1対1のことば（話して入力 → Claude が整理 → 先生が直して確定）
export function OneOnOneEditor({ date, sampleTranscript, saved }: Props) {
  const [transcript, setTranscript] = useState(saved?.transcript ?? "");
  const [organizedFor, setOrganizedFor] = useState(saved?.transcript ?? ""); // 整理したときの文字起こし
  const [interim, setInterim] = useState("");
  const [id, setId] = useState<number | null>(saved?.id ?? null);
  const [organized, setOrganized] = useState<OneOnOneOrganized | null>(saved?.organized ?? null);
  const [confirmed, setConfirmed] = useState(saved?.confirmed ?? false);
  const [fromDemo, setFromDemo] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastAdded = useRef<HTMLInputElement | null>(null);

  const changedSinceOrganize = organized !== null && transcript.trim() !== organizedFor.trim();

  const organize = () => {
    if (confirmed && !window.confirm("確定した整理は消えて、新しく整理し直します。よろしいですか？")) return;
    setError(null);
    setNotice(null);
    const sent = transcript;
    startTransition(async () => {
      try {
        const r = await organizeOneOnOne(date, sent);
        if (!r.ok) {
          setError(r.message);
          return;
        }
        setId(r.id);
        setOrganizedFor(sent);
        // 整理できなかったときは、先生が手で書けるよう空の欄を出す
        setOrganized(r.organized ?? { pointers: [], selfAwareness: [], homework: [], toGuardian: [] });
        setFromDemo(r.source === "demo");
        setConfirmed(false);
        if (!r.organized) setNotice("いまは整理できませんでした（文字起こしは保存しました）。少し待ってもう一度ためすか、下の欄に手で書いてください。");
      } catch {
        setError("うまくつながりませんでした。もう一度ためしてください");
      }
    });
  };

  const confirm = () => {
    if (!id || !organized) return;
    setError(null);
    const sent = trimEmpty(organized);
    startTransition(async () => {
      try {
        const r = await confirmOneOnOne(id, date, sent);
        if (!r.ok) {
          setError(r.message);
          return;
        }
        setOrganized(sent);
        setConfirmed(true);
      } catch {
        setError("保存できませんでした。もう一度ためしてください");
      }
    });
  };

  const update = (fn: (o: OneOnOneOrganized) => OneOnOneOrganized) => {
    setConfirmed(false);
    setOrganized((o) => (o ? fn(o) : o));
  };

  return (
    <Card tone="coach" aria-labelledby="one-on-one" className="space-y-4">
      <SectionTitle id="one-on-one">1対1のことば</SectionTitle>
      <p className="text-xs text-muted">
        ※デモでは先生の声のみを文字にします。音声はこのアプリには送られず、保存しません（文字だけを保存）。文字にする処理は、ブラウザ・OS の音声認識を使います。
      </p>

      <VoiceInput
        disabled={pending}
        onText={(t) => setTranscript((cur) => join(cur, t))}
        onInterim={setInterim}
      />
      <label className="block space-y-1">
        <span className="text-sm font-bold text-muted">文字起こし（直せます）</span>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value.slice(0, MAX_TRANSCRIPT))}
          disabled={pending}
          rows={5}
          className="w-full rounded border border-line bg-paper p-3"
        />
      </label>
      <div className="flex items-center justify-between text-xs text-muted">
        <button type="button" disabled={pending} onClick={() => setTranscript(sampleTranscript)} className="underline">
          見本のことばを入れる
        </button>
        <span>
          {transcript.length}/{MAX_TRANSCRIPT}
        </span>
      </div>
      {interim && (
        <p aria-live="polite" className="text-sm text-muted">
          … {interim}
        </p>
      )}

      {error && (
        <p role="alert" className="border border-shu bg-paper p-3 text-sm font-bold text-shu">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="border border-line bg-paper p-3 text-sm">
          {notice}
        </p>
      )}

      <button type="button" disabled={pending || !transcript.trim()} onClick={organize} className={buttonClass.primary}>
        {pending ? "保存しています…" : organized ? "もう一度整理する" : "要点に整理する"}
      </button>

      {organized && (
        <div className="space-y-4 border-t border-line pt-4">
          <p className="text-xs text-muted">
            Claude の整理（下書き）です。先生が確かめて直してから確定してください。道場生・保護者には表示されません。
          </p>
          {fromDemo && !notice && (
            <p className="border border-shu bg-paper p-2 text-sm font-bold text-shu">保存済みのデモ応答です。</p>
          )}
          {changedSinceOrganize && (
            <p className="border border-shu bg-paper p-2 text-sm text-shu">
              文字起こしが変わりました。もう一度整理してください。
            </p>
          )}
          {SECTIONS.map(({ key, label }) => (
            <fieldset key={key} className="space-y-2" disabled={pending}>
              <legend className="text-sm font-bold">{label}</legend>
              {organized[key].length === 0 && <p className="text-xs text-muted">（なし）</p>}
              {organized[key].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    ref={i === organized[key].length - 1 ? lastAdded : undefined}
                    value={item}
                    onChange={(e) => update((o) => ({ ...o, [key]: o[key].map((x, j) => (j === i ? e.target.value : x)) }))}
                    maxLength={100}
                    aria-label={`${label} ${i + 1}`}
                    className="min-w-0 flex-1 rounded border border-line bg-paper p-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => update((o) => ({ ...o, [key]: o[key].filter((_, j) => j !== i) }))}
                    aria-label={`${label} ${i + 1} を消す`}
                    className="shrink-0 px-2 text-muted"
                  >
                    ×
                  </button>
                </div>
              ))}
              {organized[key].length < 8 && (
                <button
                  type="button"
                  onClick={() => {
                    update((o) => ({ ...o, [key]: [...o[key], ""] }));
                    requestAnimationFrame(() => lastAdded.current?.focus());
                  }}
                  aria-label={`${label}を足す`}
                  className="text-xs text-muted underline"
                >
                  ＋ 足す
                </button>
              )}
            </fieldset>
          ))}
          <button
            type="button"
            disabled={pending || changedSinceOrganize}
            onClick={confirm}
            className={buttonClass.primary}
          >
            {confirmed ? "確定しました" : pending ? "保存しています…" : "この整理で確定する"}
          </button>
          <p role="status" className="text-center text-xs text-muted">
            {confirmed ? "ノートの下書きを作るときに使います。" : ""}
          </p>
        </div>
      )}
    </Card>
  );
}

function trimEmpty(o: OneOnOneOrganized): OneOnOneOrganized {
  const t = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
  return { pointers: t(o.pointers), selfAwareness: t(o.selfAwareness), homework: t(o.homework), toGuardian: t(o.toGuardian) };
}
