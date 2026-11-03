import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { kidsDay } from "@/lib/belt-labels";
import { getLatestNote } from "@/lib/queries/latest-note";
import { QuestionFlow } from "./QuestionFlow";

// 1問ごとの呼び出し（最長 20秒×2）に余裕をもたせる
export const maxDuration = 60;

const DEMO_STUDENT = "takuya";

export default function QuestionPage() {
  return (
    <div className="space-y-4">
      <Link href="/student" className="text-sm text-ink/70 underline">
        ← ホームに もどる
      </Link>
      <h1 className="text-xl font-bold">ふりかえりの しつもん</h1>
      <Suspense fallback={<p className="py-10 text-center text-sm text-ink/60">よみこみちゅう…</p>}>
        <Question />
      </Suspense>
    </div>
  );
}

async function Question() {
  await connection();
  const note = await getLatestNote(DEMO_STUDENT);
  if (!note) {
    return (
      <p className="rounded-2xl bg-white p-5 text-center text-sm shadow-sm">
        まだ ノートが ないよ。
        <Link href="/student/note" className="underline">
          ノートを とりこもう
        </Link>
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <section aria-label="きょうの ノート" className="rounded-2xl bg-white p-4 text-sm shadow-sm">
        <p className="font-bold text-ink/70">{kidsDay(note.date)}の ノート</p>
        <dl className="mt-2 space-y-1">
          <Row label="テーマ" value={note.theme} />
          <Row label="よかったこと" value={note.good} />
          <Row label="なおしたいこと" value={note.improve} />
        </dl>
      </section>
      <QuestionFlow noteId={note.id} savedSummary={note.summary} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-ink/60">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
