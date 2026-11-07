import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, PageTitle } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { FuriganaToggle } from "@/components/ui/FuriganaToggle";
import { kidsDay } from "@/lib/belt-labels";
import { getLatestNote, listNoteDates } from "@/lib/queries/latest-note";
import { DateSelect } from "@/components/DateSelect";
import { dateParam } from "@/lib/date-param";
import { QuestionFlow } from "./QuestionFlow";

// 1問ごとの呼び出し（最長 20秒×2）に余裕をもたせる
export const maxDuration = 60;

const DEMO_STUDENT = "takuya";

export default function QuestionPage({ searchParams }: PageProps<"/student/question">) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/student" className="text-sm text-muted underline">
          <F>{"← ホームに{戻|もど}る"}</F>
        </Link>
        <FuriganaToggle />
      </div>
      <PageTitle>
        <F>{"ふりかえりの{質問|しつもん}"}</F>
      </PageTitle>
      <Suspense fallback={<p className="py-10 text-center text-sm text-muted">読み込み中…</p>}>
        <Question searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Question({ searchParams }: { searchParams: PageProps<"/student/question">["searchParams"] }) {
  await connection();
  const date = dateParam((await searchParams).date);
  const [note, dates] = await Promise.all([getLatestNote(DEMO_STUDENT, date).then((n) => n ?? (date ? getLatestNote(DEMO_STUDENT) : null)), listNoteDates(DEMO_STUDENT)]);
  if (!note) {
    return (
      <Card className="text-center text-sm">
        <F>{"まだノートがありません。"}</F>
        <Link href="/student/note" className="underline">
          <F>{"ノートを{取|と}りこもう"}</F>
        </Link>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <DateSelect dates={dates} current={note.date} label="ノートの{日|ひ}" />
      <Card aria-label="今日のノート" className="text-sm">
        <p className="font-bold text-muted">
          <F>{`${kidsDay(note.date)}のノート`}</F>
        </p>
        <dl className="mt-2 space-y-1">
          <Row label="テーマ" value={note.theme} />
          <Row label="よかったこと" value={note.good} />
          <Row label="{直|なお}したいこと" value={note.improve} />
        </dl>
      </Card>
      <QuestionFlow key={note.id} noteId={note.id} savedSummary={note.summary} fromCoach={note.fromCoach} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted">
        <F>{label}</F>
      </dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
