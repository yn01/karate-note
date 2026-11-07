"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveExamPlan } from "./actions";

type Props = {
  slug: string;
  name: string; // 読み上げ用（誰の審査予定か）
  months: { value: string; label: string }[];
  targets: { kyu: number; name: string }[];
  current: { month: string; kyu: number } | null;
};

// 審査予定を変える（先生がプルダウンで選ぶ）
export function ExamPlanEditor({ slug, name, months, targets, current }: Props) {
  const [open, setOpen] = useState(false);
  // 保存済みの値が選択肢にない（過ぎた月・昇級したあと）ときは、選び直せる値に寄せる
  const [month, setMonth] = useState(current && months.some((m) => m.value === current.month) ? current.month : "");
  const [kyu, setKyu] = useState<number>(
    current && targets.some((t) => t.kyu === current.kyu) ? current.kyu : (targets[0]?.kyu ?? 0),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const firstSelect = useRef<HTMLSelectElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) firstSelect.current?.focus();
  }, [open]);

  // 1級の道場生は、審査で目指す級がない（黒帯の審査はこのアプリの対象外）
  if (targets.length === 0) {
    return <p className="text-xs text-muted">審査で目指す級はありません（黒帯の審査は対象外）。</p>;
  }

  if (!open) {
    return (
      <button
        ref={toggle}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-label={`${name}の審査予定を変える`}
        className="min-h-11 text-sm text-muted underline"
      >
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
          <select
            ref={firstSelect}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={pending}
            className="rounded-lg border border-line bg-paper p-1.5"
          >
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
            className="rounded-lg border border-line bg-paper p-1.5"
          >
            {targets.map((t) => (
              <option key={t.kyu} value={t.kyu}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {month === "" && <p className="text-xs text-muted">審査の回を選ぶと、目指す級を選べます。</p>}
      {error && <p role="alert" className="text-xs font-bold text-shu">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded bg-ai px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "保存しています…" : "保存する"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-expanded={true} className="min-h-11 text-sm text-muted underline">
          やめる
        </button>
      </div>
      <p className="text-xs text-muted">デモのため、ログインなしで誰でも変えられます。</p>
    </div>
  );
}
