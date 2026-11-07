"use client";
// ノートの日付を選ぶ（ノートやお便りが複数の日にあるとき）。選んで「表示」を押すと ?date=YYYY-MM-DD で読み直す。
// 日付が1つしかないときは出さない。label は {漢字|よみ} の形でふりがなを付けてよい
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { F } from "@/components/ui/Furigana";
import { stripFurigana } from "@/lib/furigana";

export function DateSelect({ dates, current, label }: { dates: string[]; current: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [picked, setPicked] = useState(current);
  const [pending, startTransition] = useTransition();
  const id = useId();
  if (dates.length < 2) return null;
  const latest = dates[0];
  // 選んだだけでは画面を変えない（入力で文脈が変わらないように）。ボタンで切り替える
  const go = () =>
    startTransition(() => router.push(picked === latest ? pathname : `${pathname}?date=${picked}`));
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <label htmlFor={id} className="text-muted" aria-label={stripFurigana(label)}>
        <F>{label}</F>
      </label>
      <select
        id={id}
        value={picked}
        disabled={pending}
        onChange={(e) => setPicked(e.target.value)}
        className="rounded-lg border border-line bg-paper px-2 py-1"
      >
        {dates.map((d) => {
          const [, m, day] = d.split("-").map(Number);
          return (
            <option key={d} value={d}>
              {m}月{day}日{d === latest ? "（最新）" : ""}
            </option>
          );
        })}
      </select>
      <button
        type="button"
        onClick={go}
        disabled={pending || picked === current}
        className="rounded-lg border border-sumi/60 bg-paper px-2 py-1 font-bold disabled:opacity-40"
      >
        {pending ? "…" : <F>{"{表示|ひょうじ}"}</F>}
      </button>
    </div>
  );
}
