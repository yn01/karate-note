"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass, Card, Hanko } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { VoiceInput } from "@/components/voice/VoiceInput";
import type { NextQuestion } from "@/lib/claude/schemas";
import { stripFurigana } from "@/lib/furigana";
import { askNext, saveQuestioning, type SignedTurn } from "./actions";

type Props = { noteId: number; savedSummary: string | null; fromCoach: boolean };

type Phase = "start" | "asking" | "answering" | "summary" | "saved";

// 画面3：オープン しつもん → えらんで こたえる しつもん（クローズド）→ まとめ
export function QuestionFlow({ noteId, savedSummary, fromCoach }: Props) {
  const [phase, setPhase] = useState<Phase>("start");
  const [turns, setTurns] = useState<SignedTurn[]>([]);
  const [current, setCurrent] = useState<NextQuestion | null>(null);
  const [fromDemo, setFromDemo] = useState(false);
  const [summary, setSummary] = useState("");
  const [freeText, setFreeText] = useState(false);
  const [draft, setDraft] = useState(""); // 送るまで答えを残す（失敗しても書き直さなくてよいように）
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottom.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [turns.length, phase]);

  const ask = (history: SignedTurn[]) => {
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
          setSummary(stripFurigana(q.summary));
          setPhase("summary");
          return;
        }
        if (result.turn) setTurns([...history, result.turn]);
        setCurrent(q);
        setFreeText(q.type === "open");
        setDraft("");
        setPhase("answering");
      } catch {
        setError("うまくつながりませんでした。もう{一度|いちど}ためしてね");
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
        setError("{保存|ほぞん}できませんでした。もう{一度|いちど}ためしてね");
      }
    });
  };

  const restart = () => {
    setTurns([]);
    setCurrent(null);
    setSummary("");
    setDraft("");
    setFreeText(false);
    setError(null);
    setFromDemo(false);
    setPhase("start");
  };

  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        {phase === "asking" ? "考えています" : phase === "saved" ? "保存しました" : ""}
      </p>
      {fromDemo && (
        <p className="rounded-lg border border-shu bg-paper p-3 text-sm font-bold text-shu">
          <F>{"いまは{見本|みほん}の{質問|しつもん}です。"}</F>
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-shu bg-paper p-3 text-sm font-bold text-shu">
          <F>{error}</F>
        </p>
      )}

      {phase === "start" && (
        <div className="space-y-3">
          {savedSummary && (
            <p className="rounded-lg border border-line bg-paper p-3 text-sm">
              <F>{"{前|まえ}に{決|き}めたこと："}</F>
              {savedSummary}
            </p>
          )}
          {fromCoach && !fromDemo && (
            <p className="rounded-lg bg-ai/5 px-3 py-2 text-sm font-bold text-ai">
              <F>{"{先生|せんせい}と{話|はな}したことをもとにした{質問|しつもん}だよ"}</F>
            </p>
          )}
          <p className="text-sm text-muted">
            <F>{"{今日|きょう}の{稽古|けいこ}をいっしょにふりかえろう。{質問|しつもん}は3つまでです。{答|こた}えは、{声|こえ}で{言|い}ってもいいよ。{答|こた}えは{先生|せんせい}も{読|よ}むよ。"}</F>
          </p>
          <button type="button" onClick={() => ask([])} className={buttonClass.primary}>
            はじめる
          </button>
        </div>
      )}

      {turns.length > 0 && (
        <ol className="space-y-3" aria-label="やりとり">
          {turns.map((t, i) =>
            t.role === "claude" ? (
              <li
                key={i}
                className="mr-8 rounded-2xl rounded-tl-sm border border-line border-l-4 border-l-ai bg-paper p-4 shadow-[0_4px_12px_-8px_rgba(60,45,25,0.35)]"
                aria-live={i === turns.length - 1 ? "polite" : undefined}
              >
                <p className="text-xs font-bold text-muted">
                  <F>
                    {t.type === "closed"
                      ? "{選|えら}んで{答|こた}える{質問|しつもん}"
                      : "{自由|じゆう}に{答|こた}える{質問|しつもん}"}
                  </F>
                </p>
                <p id={i === turns.length - 1 ? "current-question" : undefined} className="mt-1 text-lg leading-relaxed">
                  <F>{t.text}</F>
                </p>
              </li>
            ) : (
              <li key={i} className="ml-8 rounded-2xl rounded-tr-sm bg-ai p-4 text-white">
                <p className="text-lg">{t.text}</p>
              </li>
            ),
          )}
        </ol>
      )}

      {phase === "asking" && (
        <p className="text-center font-bold">
          <F>{"{考|かんが}えています…"}</F>
        </p>
      )}

      {phase === "answering" && current && (
        <div className="space-y-3">
          {current.type === "closed" && !freeText && (
            <>
              <div role="group" aria-labelledby="current-question" className="grid gap-2">
                {current.choices.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={pending}
                    onClick={() => answer(stripFurigana(c))}
                    className="rounded-xl border-2 border-ai/60 bg-paper px-4 py-3 text-left text-lg font-bold shadow-[0_3px_0_rgba(31,58,99,0.25)] transition active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                  >
                    <F>{c}</F>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setFreeText(true)} className="w-full py-2 text-sm text-muted underline">
                <F>{"{自分|じぶん}の{言葉|ことば}で{答|こた}える"}</F>
              </button>
            </>
          )}
          {(current.type === "open" || freeText) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                answer(draft);
              }}
              className="space-y-2"
            >
              {/* 声は文字にするだけで、このアプリには送らない・残さない。ラベルの外に置く（ラベルを押して始まらないように） */}
              <VoiceInput
                disabled={pending}
                onText={(t) => setDraft((cur) => (cur ? `${cur}${t}` : t).slice(0, 200))}
                startLabel={<F>{"{声|こえ}で{答|こた}える"}</F>}
                stopLabel={<F>{"とめる（{聞|き}いています…）"}</F>}
                texts={{
                  listening: <F>{"{聞|き}いているよ"}</F>,
                  failed: <F>{"うまく{始|はじ}められなかったよ。もう{一度|いちど}{押|お}してね"}</F>,
                  stopped: <F>{"{声|こえ}の{入力|にゅうりょく}が{止|と}まったよ"}</F>,
                  unsupported: <F>{"ここでは{声|こえ}で{答|こた}えられないよ。キーボードのマイクを{使|つか}ってね"}</F>,
                  "not-allowed": <F>{"マイクが{使|つか}えないよ。おうちの{人|ひと}に{聞|き}いてね"}</F>,
                  "service-not-allowed": <F>{"マイクが{使|つか}えないよ。おうちの{人|ひと}に{聞|き}いてね"}</F>,
                  "no-speech": <F>{"{声|こえ}が{聞|き}こえなかったよ。もう{一度|いちど}{話|はな}してね"}</F>,
                }}
              />
              <label className="block space-y-1">
                <span className="text-sm font-bold text-muted">
                  <F>{"{答|こた}え（{声|こえ}で{言|い}ってもいいよ）"}</F>
                </span>
                <textarea
                  name="answer"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-describedby="current-question"
                  rows={2}
                  maxLength={200}
                  required
                  className="w-full rounded-lg border border-line bg-paper p-3 text-lg"
                />
              </label>
              <button type="submit" disabled={pending} className={buttonClass.primary}>
                <F>{"{答|こた}える"}</F>
              </button>
            </form>
          )}
        </div>
      )}

      {phase === "summary" && (
        <Card className="space-y-3">
          {current?.text && (
            <p className="text-lg">
              <F>{current.text}</F>
            </p>
          )}
          <label className="block space-y-1">
            <span className="text-sm font-bold text-muted">
              <F>{"{今日|きょう}{決|き}めたこと（{直|なお}してもいいよ）"}</F>
            </span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full rounded-lg border border-line bg-paper p-3 text-lg"
            />
          </label>
          <button type="button" disabled={pending || !summary.trim()} onClick={save} className={buttonClass.primary}>
            <F>{pending ? "{保存|ほぞん}しています…" : "これで{決|き}めた"}</F>
          </button>
          <button type="button" disabled={pending} onClick={restart} className="w-full py-2 text-sm text-muted underline">
            <F>{"はじめからやり{直|なお}す"}</F>
          </button>
        </Card>
      )}

      {phase === "saved" && (
        <Card className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-3">
            <Hanko size={48}>{"決定"}</Hanko>
            <p className="font-mincho text-lg font-extrabold">
              <F>{"{保存|ほぞん}しました"}</F>
            </p>
          </div>
          <p className="text-sm">{summary}</p>
          <p className="rounded-lg bg-ai/5 px-3 py-2 font-bold text-ai">
            <F>{"このふりかえりは、{先生|せんせい}にとどくよ。{次|つぎ}の{稽古|けいこ}で、{先生|せんせい}と{話|はな}そう。"}</F>
          </p>
          <Link href="/student" className="block text-sm text-muted underline">
            <F>{"ホームに{戻|もど}る"}</F>
          </Link>
        </Card>
      )}
      <div ref={bottom} />
    </div>
  );
}
