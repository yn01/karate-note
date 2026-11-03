"use client";

import { useState, useTransition } from "react";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { CRITERIA_STATUS_LABEL, type CriteriaStatus } from "@/lib/criteria";
import { saveCriteria } from "./actions";

type Props = { criteria: { key: string; label: string; status: CriteriaStatus | null }[] };

// 到達基準のチェック（平安二段）。状態は先生が付ける。Claude は判定しない
export function CriteriaEditor({ criteria }: Props) {
  const [values, setValues] = useState<Record<string, CriteriaStatus | "">>(
    Object.fromEntries(criteria.map((c) => [c.key, c.status ?? ""])),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await saveCriteria(values);
        if (!r.ok) setError(r.message);
        else setSaved(true);
      } catch {
        setError("保存できませんでした。もう一度ためしてください");
      }
    });
  };

  return (
    <Card tone="coach" aria-labelledby="criteria" className="space-y-3">
      <SectionTitle id="criteria">到達基準のチェック（平安二段）</SectionTitle>
      <p className="text-xs text-muted">先生が付けます。Claude は判定しません。道場生・保護者には段階は見せません。</p>
      {criteria.map((c) => (
        <label key={c.key} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 flex-1">{c.label}</span>
          <select
            value={values[c.key]}
            disabled={pending}
            onChange={(e) => {
              setSaved(false);
              setValues((v) => ({ ...v, [c.key]: e.target.value as CriteriaStatus | "" }));
            }}
            className="shrink-0 rounded border border-line bg-paper p-2"
          >
            <option value="">（未）</option>
            {(Object.keys(CRITERIA_STATUS_LABEL) as CriteriaStatus[]).map((s) => (
              <option key={s} value={s}>
                {CRITERIA_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      ))}
      {error && <p role="alert" className="text-sm font-bold text-shu">{error}</p>}
      <button type="button" disabled={pending} onClick={save} className={buttonClass.secondary}>
        {saved ? "保存しました" : pending ? "保存しています…" : "チェックを保存する"}
      </button>
    </Card>
  );
}
