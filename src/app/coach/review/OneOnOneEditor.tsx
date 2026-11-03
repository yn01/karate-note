"use client";

import { useState, useTransition } from "react";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { VoiceInput } from "@/components/voice/VoiceInput";
import type { OneOnOneOrganized } from "@/db";
import { stripFurigana } from "@/lib/furigana";
import { confirmOneOnOne, organizeOneOnOne } from "./actions";

type Props = {
  defaultDate: string;
  sampleTranscript: string;
  saved: { id: number; transcript: string; organized: OneOnOneOrganized | null; confirmed: boolean } | null;
};

const SECTIONS: { key: keyof OneOnOneOrganized; label: string }[] = [
  { key: "pointers", label: "指摘" },
  { key: "selfAwareness", label: "本人の気づき" },
  { key: "homework", label: "来週の宿題" },
  { key: "toGuardian", label: "保護者に伝えたいこと" },
];

// 画面7の一部：1対1のことば（話して入力 → Claude が整理 → 先生が直して確定）
export function OneOnOneEditor({ defaultDate, sampleTranscript, saved }: Props) {
  const [date, setDate] = useState(defaultDate);
  const [transcript, setTranscript] = useState(saved?.transcript ?? "");
  const [interim, setInterim] = useState("");
  const [id, setId] = useState<number | null>(saved?.id ?? null);
  const [organized, setOrganized] = useState<OneOnOneOrganized | null>(saved?.organized ?? null);
  const [confirmed, setConfirmed] = useState(saved?.confirmed ?? false);
  const [fromDemo, setFromDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const organize = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await organizeOneOnOne(date, transcript);
        if (!r.ok) {
          setError(stripFurigana(r.message));
          return;
        }
        setId(r.id);
        setOrganized(r.organized);
        setFromDemo(r.source === "demo");
        setConfirmed(false);
      } catch {
        setError("うまくつながりませんでした。もう一度ためしてください");
      }
    });
  };

  const confirm = () => {
    if (!id || !organized) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await confirmOneOnOne(id, organized);
        if (!r.ok) {
          setError(r.message);
          return;
        }
        setConfirmed(true);
      } catch {
        setError("保存できませんでした。もう一度ためしてください");
      }
    });
  };

  const edit = (key: keyof OneOnOneOrganized, i: number, value: string) => {
    setConfirmed(false);
    setOrganized((o) => (o ? { ...o, [key]: o[key].map((x, j) => (j === i ? value : x)) } : o));
  };
  const remove = (key: keyof OneOnOneOrganized, i: number) => {
    setConfirmed(false);
    setOrganized((o) => (o ? { ...o, [key]: o[key].filter((_, j) => j !== i) } : o));
  };
  const add = (key: keyof OneOnOneOrganized) => {
    setConfirmed(false);
    setOrganized((o) => (o ? { ...o, [key]: [...o[key], ""] } : o));
  };

  return (
    <Card tone="coach" aria-labelledby="one-on-one" className="space-y-4">
      <SectionTitle id="one-on-one">1対1のことば</SectionTitle>
      <p className="text-xs text-muted">※デモでは先生の声のみを文字にします。音声は保存しません（文字だけを保存）。</p>

      <label className="block space-y-1">
        <span className="text-sm font-bold text-muted">日付</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded border border-line bg-paper p-2.5"
        />
      </label>

      <VoiceInput
        onText={(t) => setTranscript((cur) => (cur ? `${cur}${t}` : t))}
        onInterim={setInterim}
      />
      <label className="block space-y-1">
        <span className="text-sm font-bold text-muted">文字起こし（直せます）</span>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={5}
          maxLength={2000}
          className="w-full rounded border border-line bg-paper p-3"
        />
        {interim && <span className="block text-sm text-muted">… {interim}</span>}
      </label>
      <button type="button" onClick={() => setTranscript(sampleTranscript)} className="text-sm text-muted underline">
        見本のことばを入れる
      </button>

      {error && (
        <p role="alert" className="border border-shu bg-paper p-3 text-sm font-bold text-shu">
          {error}
        </p>
      )}

      <button type="button" disabled={pending || !transcript.trim()} onClick={organize} className={buttonClass.primary}>
        {pending && !organized ? "整理しています…" : organized ? "もう一度整理する" : "要点に整理する"}
      </button>

      {organized && (
        <div className="space-y-4 border-t border-line pt-4">
          <p className="text-xs text-muted">
            Claude の整理（下書き）です。先生が確かめて直してから確定してください。道場生・保護者には表示されません。
          </p>
          {fromDemo && (
            <p className="border border-shu bg-paper p-2 text-sm font-bold text-shu">保存済みのデモ応答です。</p>
          )}
          {SECTIONS.map(({ key, label }) => (
            <fieldset key={key} className="space-y-2">
              <legend className="text-sm font-bold">{label}</legend>
              {organized[key].length === 0 && <p className="text-xs text-muted">（なし）</p>}
              {organized[key].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item}
                    onChange={(e) => edit(key, i, e.target.value)}
                    maxLength={100}
                    aria-label={`${label} ${i + 1}`}
                    className="min-w-0 flex-1 rounded border border-line bg-paper p-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => remove(key, i)}
                    aria-label={`${label} ${i + 1} を消す`}
                    className="shrink-0 px-2 text-muted"
                  >
                    ×
                  </button>
                </div>
              ))}
              {organized[key].length < 8 && (
                <button type="button" onClick={() => add(key)} className="text-xs text-muted underline">
                  ＋ 足す
                </button>
              )}
            </fieldset>
          ))}
          <button type="button" disabled={pending} onClick={confirm} className={buttonClass.primary}>
            {confirmed ? "確定しました" : pending ? "保存しています…" : "この整理で確定する"}
          </button>
          {confirmed && <p className="text-center text-xs text-muted">ノートの下書きを作るときに使います。</p>}
        </div>
      )}
    </Card>
  );
}
