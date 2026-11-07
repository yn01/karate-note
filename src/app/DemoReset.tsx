"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { resetDemo } from "./actions";

const MODES = {
  start: { label: "最初から", text: "11月1日のノートを取りこむ前。ノートの取り込みから承認まで、流れを一から試せます。" },
  done: { label: "一周したあと", text: "11月1日のノート・問いかけ・1対1・先生の承認まで済んだ状態。お便りや次のテーマがすぐ見られます。" },
} as const;

// ログインがないデモなので、だれでも承認や上書きができる。触ったあとに戻せるようにする
export function DemoReset() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (mode: keyof typeof MODES) => {
    if (!window.confirm(`デモを「${MODES[mode].label}」の状態に戻します。いまのデータは消えます。よろしいですか？`)) return;
    setMessage(null);
    start(async () => {
      const r = await resetDemo(mode);
      setMessage(r.ok ? `「${MODES[r.mode].label}」の状態に戻しました。` : r.message);
    });
  };

  return (
    <section aria-labelledby="reset" className="space-y-3 rounded-2xl border border-dashed border-line p-4">
      <h2 id="reset" className="text-sm font-bold">
        デモを戻す
      </h2>
      <p className="text-xs leading-relaxed text-muted">
        ログインのないデモなので、だれでも承認や上書きができます。触ったあとは、ここで戻せます（架空のデータを入れ直します）。
      </p>
      {(Object.keys(MODES) as (keyof typeof MODES)[]).map((m) => (
        <div key={m} className="space-y-1">
          <button type="button" onClick={() => run(m)} disabled={pending} className={buttonClass.secondary}>
            {MODES[m].label}に戻す
          </button>
          <p className="text-xs leading-relaxed text-muted">{MODES[m].text}</p>
        </div>
      ))}
      <p role="status" className="text-sm">
        {pending ? "戻しています…" : message}
      </p>
    </section>
  );
}
