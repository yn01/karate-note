"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, Card } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { stripFurigana } from "@/lib/furigana";
import { LIMITS } from "@/lib/review-fields";
import { chooseTheme } from "./actions";

type Props = {
  reviewId: number;
  candidates: string[];
  chosen: { text: string; isRewritten: boolean } | null;
};

export function ThemeChooser({ reviewId, candidates, chosen }: Props) {
  const router = useRouter();
  const initialIndex = chosen
    ? candidates.findIndex(
        (c) => stripFurigana(c) === stripFurigana(chosen.text),
      )
    : -1;
  const [choice, setChoice] = useState<number | null>(
    initialIndex >= 0 ? initialIndex : null,
  );
  const [text, setText] = useState(chosen ? stripFurigana(chosen.text) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pick = (i: number) => {
    setChoice(i);
    setText(stripFurigana(candidates[i]));
    setMessage(null);
  };

  const submit = () =>
    start(async () => {
      const r = await chooseTheme({ reviewId, choice, text });
      if (!r.ok) return setMessage(r.message);
      router.push("/student");
    });

  return (
    <div className="space-y-4">
      <p className="text-sm leading-loose">
        <F>
          {
            "ふりかえりから{出|で}てきて、{先生|せんせい}が{確|たし}かめた{候補|こうほ}だよ。{自分|じぶん}の{言葉|ことば}で{書|か}きかえてもいいよ。"
          }
        </F>
      </p>

      <fieldset className="space-y-2">
        <legend className="sr-only">テーマの候補</legend>
        {candidates.map((c, i) => (
          <label
            key={i}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 bg-paper p-3 leading-loose ${
              choice === i ? "border-ai" : "border-line"
            }`}
          >
            <input
              type="radio"
              name="theme"
              checked={choice === i}
              onChange={() => pick(i)}
              className="mt-2 size-5 accent-ai"
            />
            <span className="font-mincho text-lg font-bold">
              <F>{c}</F>
            </span>
          </label>
        ))}
      </fieldset>

      <Card className="space-y-2">
        <label htmlFor="theme-text" className="block text-sm font-bold">
          <F>{"{自分|じぶん}の{言葉|ことば}で{書|か}く"}</F>
        </label>
        <textarea
          id="theme-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMessage(null);
          }}
          rows={2}
          maxLength={LIMITS.theme}
          className="w-full rounded-lg border border-line bg-paper p-2 text-lg"
        />
        <p className="text-xs text-muted">
          <F>
            {
              "{候補|こうほ}を{選|えら}ぶと、ここに{入|はい}るよ。{直|なお}してもいいよ。"
            }
          </F>
        </p>
      </Card>

      {message && (
        <p role="alert" className="text-sm text-shu">
          <F>{message}</F>
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !text.trim()}
        className={`${buttonClass.primary} w-full`}
      >
        {pending ? <F>{"{保存|ほぞん}しているよ…"}</F> : <F>{"これにする"}</F>}
      </button>
    </div>
  );
}
