"use client";

import { useState, useTransition } from "react";
import { buttonClass, Card } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { stripFurigana } from "@/lib/furigana";
import { GOAL_LIMITS } from "@/lib/goals";
import { saveSelfGoals } from "./actions";

// ホームの「わたしの目標」。本人が見て、自分で直せる
export function GoalEditor({ initial }: { initial: string[] }) {
  const [goals, setGoals] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = () => {
    const xs = goals.map(stripFurigana);
    setDraft(xs.length < GOAL_LIMITS.count ? [...xs, ""] : xs);
    setMessage(null);
    setEditing(true);
  };

  const save = () =>
    start(async () => {
      const r = await saveSelfGoals(draft);
      if (!r.ok) return setMessage(r.message);
      setGoals(r.goals);
      setEditing(false);
    });

  return (
    <Card aria-labelledby="goals" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p id="goals" className="text-xs text-muted">
          <F>{"わたしの{目標|もくひょう}"}</F>
        </p>
        {!editing && (
          <button
            type="button"
            onClick={open}
            className="text-xs text-ai underline"
          >
            <F>{"{直|なお}す"}</F>
          </button>
        )}
      </div>

      {!editing ? (
        goals.length > 0 ? (
          <ul className="space-y-1 leading-loose">
            {goals.map((g, i) => (
              <li key={i} className="font-mincho font-bold">
                ・<F>{g}</F>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            <F>
              {
                "まだ{書|か}いていないよ。「{直|なお}す」から{書|か}いてみよう。"
              }
            </F>
          </p>
        )
      ) : (
        <div className="space-y-2">
          {draft.map((g, i) => (
            <input
              key={i}
              value={g}
              onChange={(e) =>
                setDraft(draft.map((x, j) => (j === i ? e.target.value : x)))
              }
              maxLength={GOAL_LIMITS.length}
              aria-label={`目標 ${i + 1}`}
              className="w-full rounded border border-line bg-paper p-2"
            />
          ))}
          {draft.length < GOAL_LIMITS.count && (
            <button
              type="button"
              onClick={() => setDraft([...draft, ""])}
              className="text-xs text-muted underline"
            >
              <F>{"＋ {足|た}す"}</F>
            </button>
          )}
          {message && (
            <p role="alert" className="text-sm text-shu">
              <F>{message}</F>
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className={`${buttonClass.primary} flex-1`}
            >
              {pending ? (
                <F>{"{保存|ほぞん}しているよ…"}</F>
              ) : (
                <F>{"{保存|ほぞん}する"}</F>
              )}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className={`${buttonClass.secondary} flex-1`}
            >
              やめる
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
