"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { QuestionTurn } from "@/db";
import type { NextQuestion } from "@/lib/claude/schemas";
import { askNext, saveQuestioning } from "./actions";

type Props = { noteId: number; savedSummary: string | null };

type Phase = "start" | "asking" | "answering" | "summary" | "saved";

// 画面3：オープン しつもん → えらんで こたえる しつもん（クローズド）→ まとめ
export function QuestionFlow({ noteId, savedSummary }: Props) {
  const [phase, setPhase] = useState<Phase>("start");
  const [turns, setTurns] = useState<QuestionTurn[]>([]);
  const [current, setCurrent] = useState<NextQuestion | null>(null);
  const [fromDemo, setFromDemo] = useState(false);
  const [summary, setSummary] = useState("");
  const [freeText, setFreeText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, phase]);

  const ask = (history: QuestionTurn[]) => {
    setError(null);
    setPhase("asking");
    startTransition(async () => {
      try {
        const result = await askNext(noteId, history);
        if (!result.ok) {
          setError(result.message);
          setPhase(history.length === 0 ? "start" : "answering");
          return;
        }
        const q = result.question;
        if (result.source === "demo") setFromDemo(true);
        if (q.done) {
          setTurns(history);
          setCurrent(q);
          setSummary(q.summary);
          setPhase("summary");
          return;
        }
        setTurns([...history, { role: "claude", type: q.type, text: q.text, choices: q.choices }]);
        setCurrent(q);
        setFreeText(q.type === "open");
        setPhase("answering");
      } catch {
        setError("うまく つながらなかったよ。もういちど ためしてね");
        setPhase(history.length === 0 ? "start" : "answering");
      }
    });
  };

  const answer = (text: string) => {
    const t = text.trim();
    if (!t) return;
    ask([...turns, { role: "student", text: t.slice(0, 200) }]);
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveQuestioning(noteId, turns, summary);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setPhase("saved");
      } catch {
        setError("ほぞん できなかったよ。もういちど ためしてね");
      }
    });
  };

  const restart = () => {
    setTurns([]);
    setCurrent(null);
    setSummary("");
    setFromDemo(false);
    setPhase("start");
  };

  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        {phase === "asking" ? "かんがえて いるよ" : phase === "saved" ? "ほぞん したよ" : ""}
      </p>
      {fromDemo && (
        <p className="rounded-xl bg-amber-100 p-3 text-sm font-bold">いまは みほんの しつもんだよ。</p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {phase === "start" && (
        <div className="space-y-3">
          {savedSummary && (
            <p className="rounded-xl bg-sky-50 p-3 text-sm">
              まえに きめたこと：{savedSummary}
            </p>
          )}
          <p className="text-sm text-ink/80">きょうの けいこを いっしょに ふりかえろう。しつもんは 3つまでだよ。</p>
          <button
            type="button"
            onClick={() => ask([])}
            className="w-full rounded-2xl bg-ink py-4 text-lg font-bold text-white"
          >
            はじめる
          </button>
        </div>
      )}

      {turns.length > 0 && (
        <ol className="space-y-3" aria-label="やりとり">
          {turns.map((t, i) =>
            t.role === "claude" ? (
              <li key={i} className="mr-8 rounded-2xl rounded-tl-none bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-ink/60">
                  {t.type === "closed" ? "えらんで こたえる しつもん（クローズド）" : "オープン しつもん"}
                </p>
                <p className="mt-1 text-lg leading-relaxed">{t.text}</p>
              </li>
            ) : (
              <li key={i} className="ml-8 rounded-2xl rounded-tr-none bg-ink p-4 text-white">
                <p className="text-lg">{t.text}</p>
              </li>
            ),
          )}
        </ol>
      )}

      {phase === "asking" && <p className="text-center font-bold">かんがえて いるよ…</p>}

      {phase === "answering" && current && (
        <div className="space-y-3">
          {current.type === "closed" && !freeText && (
            <>
              <div className="grid gap-2">
                {current.choices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={pending}
                    onClick={() => answer(c)}
                    className="rounded-2xl border-2 border-ink bg-white px-4 py-3 text-left text-lg font-bold disabled:opacity-50"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setFreeText(true)} className="w-full py-2 text-sm text-ink/70 underline">
                じぶんの ことばで こたえる
              </button>
            </>
          )}
          {(current.type === "open" || freeText) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                answer(String(data.get("answer") ?? ""));
                e.currentTarget.reset();
              }}
              className="space-y-2"
            >
              <label className="block space-y-1">
                <span className="text-sm font-bold text-ink/80">こたえ（マイクの ボタンで はなしても いいよ）</span>
                <textarea
                  name="answer"
                  rows={2}
                  maxLength={200}
                  required
                  className="w-full rounded-xl border border-ink/30 bg-white p-3 text-lg"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-2xl bg-ink py-3 text-lg font-bold text-white disabled:opacity-50"
              >
                こたえる
              </button>
            </form>
          )}
        </div>
      )}

      {phase === "summary" && (
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          {current?.text && <p className="text-lg">{current.text}</p>}
          <label className="block space-y-1">
            <span className="text-sm font-bold text-ink/80">きょう きめたこと（なおしても いいよ）</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full rounded-xl border border-ink/30 bg-white p-3 text-lg"
            />
          </label>
          <button
            type="button"
            disabled={pending || !summary.trim()}
            onClick={save}
            className="w-full rounded-2xl bg-ink py-4 text-lg font-bold text-white disabled:opacity-50"
          >
            {pending ? "ほぞん しているよ…" : "これで きめた"}
          </button>
          <button type="button" disabled={pending} onClick={restart} className="w-full py-2 text-sm text-ink/70 underline">
            はじめから やりなおす
          </button>
        </div>
      )}

      {phase === "saved" && (
        <div className="space-y-3 rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className="text-lg font-bold">ほぞん したよ！</p>
          <p className="text-sm">{summary}</p>
          <p className="text-xs text-ink/60">せんせいが よんで、つぎの テーマを いっしょに かんがえるよ。</p>
          <Link href="/student" className="block text-sm text-ink/70 underline">
            ホームに もどる
          </Link>
        </div>
      )}
      <div ref={bottom} />
    </div>
  );
}
