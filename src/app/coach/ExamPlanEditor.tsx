"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveExamPlan } from "./actions";

type Props = {
  slug: string;
  months: { value: string; label: string }[];
  targets: { kyu: number; name: string }[];
  current: { month: string; kyu: number } | null;
};

// 審査予定を変える（先生がプルダウンで選ぶ）
export function ExamPlanEditor({ slug, months, targets, current }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(current?.month ?? "");
  const [kyu, setKyu] = useState<number>(current?.kyu ?? targets[0]?.kyu ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline">
        審査予定を変える
      </button>
    );
  }

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await saveExamPlan(slug, month, kyu);
        if (!r.ok) {
          setError(r.message);
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("保存できませんでした。もう一度ためしてください");
      }
    });
  };

  return (
    <div className="mt-2 space-y-2 border-t border-line pt-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1">
          <span className="text-xs text-muted">審査の回</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={pending} className="rounded border border-line bg-paper p-1.5">
            <option value="">未定</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-xs text-muted">目指す級</span>
          <select
            value={kyu}
            onChange={(e) => setKyu(Number(e.target.value))}
            disabled={pending || month === ""}
            className="rounded border border-line bg-paper p-1.5"
          >
            {targets.map((t) => (
              <option key={t.kyu} value={t.kyu}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p role="alert" className="text-xs font-bold text-shu">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded bg-ai px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "保存しています…" : "保存する"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} className="text-xs text-muted underline">
          やめる
        </button>
      </div>
      <p className="text-xs text-muted">デモのため、ログインなしで誰でも変えられます。</p>
    </div>
  );
}
