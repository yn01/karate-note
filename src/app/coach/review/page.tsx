import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, PageTitle } from "@/components/ui";
import { getCoachReview } from "@/lib/queries/coach-review";
import demoInputs from "../../../../data/seed/demo-inputs.json";
import { OneOnOneEditor } from "./OneOnOneEditor";

// 整理の呼び出し（最長 20秒×2）に余裕をもたせる
export const maxDuration = 60;

const DEMO_STUDENT = "takuya";

export default function CoachReviewPage() {
  return (
    <div className="space-y-4">
      <Link href="/coach" className="text-sm text-muted underline">
        ← 道場生一覧
      </Link>
      <PageTitle>ノートの確認</PageTitle>
      <Suspense fallback={<p className="py-10 text-center text-sm text-muted">読み込み中…</p>}>
        <Review />
      </Suspense>
    </div>
  );
}

async function Review() {
  await connection();
  const data = await getCoachReview(DEMO_STUDENT);
  if (!data) return <Card tone="coach">まだノートがありません。</Card>;
  const { note, oneOnOne } = data;
  const [, m, d] = note.date.split("-").map(Number);

  return (
    <div className="space-y-4">
      <Card tone="coach" aria-label="道場生のノート" className="text-sm">
        <p className="font-bold">
          {note.name}
          {note.honorific}　{m}月{d}日のノート
        </p>
        <dl className="mt-2 space-y-1">
          <Row label="今日のテーマ" value={note.theme} />
          <Row label="よかったこと" value={note.good} />
          <Row label="直したいこと" value={note.improve} />
        </dl>
      </Card>
      <OneOnOneEditor
        defaultDate={note.date}
        sampleTranscript={demoInputs.oneOnOne.transcript}
        saved={
          oneOnOne
            ? {
                id: oneOnOne.id,
                transcript: oneOnOne.transcript,
                organized: oneOnOne.organized,
                confirmed: oneOnOne.organizedConfirmedAt !== null,
              }
            : null
        }
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
