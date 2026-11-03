"use client";

import { useState, useTransition } from "react";
import { buttonClass, Card, Hanko, SectionTitle } from "@/components/ui";
import type { CheckResult, Draft } from "@/lib/claude/schemas";
import { CRITERIA_STATUS_LABEL, type CriteriaStatus } from "@/lib/criteria";
import { approveReview, generateDraft, runCheck } from "./actions";

type Props = {
  noteId: number;
  criteria: { key: string; status: CriteriaStatus | null }[];
  saved: { draft: Draft | null; final: Draft | null; check: CheckResult | null; approved: boolean } | null;
};

type LetterListKey = "watchPoints" | "cheerHints";

// 画面7：下書き（場面4）→ 点検（場面5）→ 先生が直して承認
export function DraftEditor({ noteId, criteria, saved }: Props) {
  // 承認済みなら承認した内容を、なければ下書きを編集の出発点にする
  const [draft, setDraft] = useState<Draft | null>(saved?.final ?? saved?.draft ?? null);
  const [check, setCheck] = useState<CheckResult | null>(saved?.check ?? null);
  const [checkFromDemo, setCheckFromDemo] = useState(false);
  const [draftFromDemo, setDraftFromDemo] = useState(false);
  const [approved, setApproved] = useState(saved?.approved ?? false);
  const [dirty, setDirty] = useState(false); // 承認したあとに直したか
  const [phase, setPhase] = useState<"idle" | "drafting" | "checking" | "approving">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const busy = phase !== "idle";
  const statusOf = new Map(criteria.map((c) => [c.key, c.status]));

  const check_ = (d: Draft) => {
    setPhase("checking");
    startTransition(async () => {
      try {
        const r = await runCheck(noteId, d);
        if (!r.ok) setError(r.message);
        else {
          setCheck(r.check);
          setCheckFromDemo(r.source === "demo");
        }
      } catch {
        setError("点検できませんでした。もう一度「点検する」を押してください");
      } finally {
        setPhase("idle");
      }
    });
  };

  const create = () => {
    if (approved && !window.confirm("承認した内容はそのままで、新しい下書きを作ります。画面の内容は新しい下書きに置きかわります。よろしいですか？")) return;
    setError(null);
    setNotice(null);
    setPhase("drafting");
    startTransition(async () => {
      try {
        const r = await generateDraft(noteId);
        if (!r.ok) {
          setError(r.message);
          setPhase("idle");
          return;
        }
        setDraft(r.draft);
        setDraftFromDemo(r.source === "demo");
        setCheck(null);
        setDirty(approved);
        if (!r.usable) {
          setNotice("いまは下書きを作れませんでした。少し待ってもう一度ためすか、下の欄に手で書いてください。");
          setPhase("idle");
          return;
        }
        // 下書きができたら、続けて点検する
        check_(r.draft);
      } catch {
        setError("うまくつながりませんでした。もう一度ためしてください");
        setPhase("idle");
      }
    });
  };

  const approve = () => {
    if (!draft) return;
    setError(null);
    setPhase("approving");
    startTransition(async () => {
      try {
        const r = await approveReview(noteId, draft);
        if (!r.ok) setError(r.message);
        else {
          setApproved(true);
          setDirty(false);
        }
      } catch {
        setError("保存できませんでした。もう一度ためしてください");
      } finally {
        setPhase("idle");
      }
    });
  };

  const edit = (fn: (d: Draft) => Draft) => {
    setDraft((d) => (d ? fn(d) : d));
    if (approved) setDirty(true);
  };

  return (
    <div className="space-y-4">
      <Card tone="coach" aria-labelledby="draft" className="space-y-4">
        <SectionTitle id="draft">下書き</SectionTitle>
        <p className="text-xs text-muted">
          Claude が先生あてに作る下書きです。先生が直して承認したものだけが、保護者と道場生に届きます。
        </p>
        <button type="button" disabled={busy} onClick={create} className={buttonClass.primary}>
          {phase === "drafting" ? "下書きを作っています…（1分ほど）" : draft ? "下書きを作り直す" : "下書きを作る"}
        </button>
        {error && <p role="alert" className="border border-shu bg-paper p-3 text-sm font-bold text-shu">{error}</p>}
        {notice && <p role="status" className="border border-line bg-paper p-3 text-sm">{notice}</p>}
        {draftFromDemo && !notice && (
          <p className="border border-shu bg-paper p-2 text-sm font-bold text-shu">保存済みのデモ応答です。</p>
        )}

        {draft && (
          <fieldset disabled={busy} className="space-y-4">
            <Area label="要約" value={draft.summary} onChange={(v) => edit((d) => ({ ...d, summary: v }))} />
            <List label="褒めポイント" items={draft.praise} onChange={(xs) => edit((d) => ({ ...d, praise: xs }))} />

            <div className="space-y-2">
              <p className="text-sm font-bold">到達基準との照合</p>
              {draft.criteriaMatch.map((c, i) => (
                <div key={c.pointKey} className="space-y-1 border-l-2 border-line pl-2">
                  <p className="text-xs">
                    {c.pointLabel}　<span className="font-bold">先生のチェック：{label(statusOf.get(c.pointKey) ?? null)}</span>
                  </p>
                  <textarea
                    value={c.comment}
                    onChange={(e) =>
                      edit((d) => ({
                        ...d,
                        criteriaMatch: d.criteriaMatch.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)),
                      }))
                    }
                    rows={2}
                    aria-label={`${c.pointLabel}の照らし合わせ`}
                    className="w-full rounded border border-line bg-paper p-2 text-sm"
                  />
                </div>
              ))}
              <p className="text-xs text-muted">照合は先生の確認用です。保護者・道場生には届きません。</p>
            </div>

            <List
              label="次回テーマの候補（道場生が選ぶ）"
              items={draft.themeCandidates}
              max={3}
              onChange={(xs) => edit((d) => ({ ...d, themeCandidates: xs }))}
            />

            <div className="space-y-2">
              <p className="text-sm font-bold">自主練</p>
              {draft.homePractice.map((h, i) => (
                <div key={i} className="space-y-1 border-l-2 border-line pl-2">
                  <Area
                    label="メニュー"
                    value={h.menu}
                    onChange={(v) => edit((d) => ({ ...d, homePractice: d.homePractice.map((x, j) => (j === i ? { ...x, menu: v } : x)) }))}
                  />
                  <Area
                    label="この練習の狙い（アウトカム）"
                    value={h.aim}
                    onChange={(v) => edit((d) => ({ ...d, homePractice: d.homePractice.map((x, j) => (j === i ? { ...x, aim: v } : x)) }))}
                  />
                </div>
              ))}
            </div>
            <List label="安全" items={draft.safety} onChange={(xs) => edit((d) => ({ ...d, safety: xs }))} />
            <Area label="計画見直しの提案（先生あて）" value={draft.planRevision} onChange={(v) => edit((d) => ({ ...d, planRevision: v }))} />

            <div className="space-y-3 border-t border-line pt-3">
              <p className="text-sm font-bold">保護者へのお便り</p>
              <Area
                label="先生のことば"
                value={draft.guardianLetter.coachWords}
                onChange={(v) => edit((d) => ({ ...d, guardianLetter: { ...d.guardianLetter, coachWords: v } }))}
              />
              <LetterList draft={draft} k="watchPoints" label="今週見てほしいところ" edit={edit} />
              <LetterList draft={draft} k="cheerHints" label="声かけのヒント" edit={edit} />
              <Area
                label="日曜の頑張り"
                value={draft.guardianLetter.effort}
                onChange={(v) => edit((d) => ({ ...d, guardianLetter: { ...d.guardianLetter, effort: v } }))}
              />
              <Area
                label="手本"
                value={draft.guardianLetter.model}
                onChange={(v) => edit((d) => ({ ...d, guardianLetter: { ...d.guardianLetter, model: v } }))}
              />
            </div>
          </fieldset>
        )}
      </Card>

      {draft && (
        <Card tone="coach" aria-labelledby="check" className="space-y-3">
          <SectionTitle id="check">点検役の確認</SectionTitle>
          <p className="text-xs text-muted">下書きとは別の呼び出しで、原則に反していないかを確かめます。直すかどうかは先生が決めます。</p>
          {phase === "checking" && <p role="status">点検しています…</p>}
          {check && phase !== "checking" && (
            <div role="status" className="space-y-2">
              {checkFromDemo && <p className="text-sm font-bold text-shu">保存済みのデモ応答です（点検はできていません）。</p>}
              {check.ok && check.issues.length === 0 ? (
                <p className="text-sm font-bold">指摘はありませんでした。</p>
              ) : (
                <ul className="space-y-2">
                  {check.issues.map((x, i) => (
                    <li key={i} className="border-l-4 border-shu bg-paper p-2 text-sm">
                      <p className="font-bold text-shu">{x.kind}</p>
                      <p>{x.message}</p>
                      {x.suggestion && <p className="text-muted">直し案：{x.suggestion}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button type="button" disabled={busy} onClick={() => check_(draft)} className={buttonClass.secondary}>
            {check ? "直した内容でもう一度点検する" : "点検する"}
          </button>
        </Card>
      )}

      {draft && (
        <Card tone="coach" aria-labelledby="approve" className="space-y-3 text-center">
          <SectionTitle id="approve">承認</SectionTitle>
          {approved && !dirty ? (
            <div className="flex items-center justify-center gap-3">
              <Hanko size={52}>承認</Hanko>
              <p className="text-sm">承認しました。保護者へのお便りと次回テーマの候補が届きます。</p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              {approved ? "承認したあとに直しています。承認し直すと、届く内容が新しくなります。" : "直し終えたら承認してください。"}
            </p>
          )}
          <button type="button" disabled={busy || (approved && !dirty)} onClick={approve} className={buttonClass.primary}>
            {phase === "approving" ? "保存しています…" : approved ? (dirty ? "直した内容で承認し直す" : "承認済み") : "直した内容で承認する"}
          </button>
        </Card>
      )}
    </div>
  );
}

function label(s: CriteriaStatus | null) {
  return s ? CRITERIA_STATUS_LABEL[s] : "（未）";
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-bold">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={600}
        className="w-full rounded border border-line bg-paper p-2 text-sm"
      />
    </label>
  );
}

function List({ label, items, onChange, max = 6 }: { label: string; items: string[]; onChange: (xs: string[]) => void; max?: number }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-bold">{label}</legend>
      {items.map((x, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={x}
            onChange={(e) => onChange(items.map((y, j) => (j === i ? e.target.value : y)))}
            maxLength={200}
            aria-label={`${label} ${i + 1}`}
            className="min-w-0 flex-1 rounded border border-line bg-paper p-2 text-sm"
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`${label} ${i + 1} を消す`} className="px-2 text-muted">
            ×
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, ""])} aria-label={`${label}を足す`} className="text-xs text-muted underline">
          ＋ 足す
        </button>
      )}
    </fieldset>
  );
}

function LetterList({ draft, k, label, edit }: { draft: Draft; k: LetterListKey; label: string; edit: (fn: (d: Draft) => Draft) => void }) {
  return (
    <List
      label={label}
      items={draft.guardianLetter[k]}
      max={3}
      onChange={(xs) => edit((d) => ({ ...d, guardianLetter: { ...d.guardianLetter, [k]: xs } }))}
    />
  );
}

