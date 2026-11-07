import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { Card, PageTitle } from "@/components/ui";
import { beltHex } from "@/lib/belt-labels";
import { todayInJapan } from "@/lib/dates";
import { examMonthLabel, upcomingExamMonths } from "@/lib/exams";
import { getCoachList } from "@/lib/queries/coach-list";
import { ExamPlanEditor } from "./ExamPlanEditor";

const DEMO_STUDENT = "takuya";

export default function CoachListPage() {
  return (
    <div className="space-y-4">
      <PageTitle>道場生一覧</PageTitle>
      <Suspense fallback={<Loading />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  await connection();
  const list = await getCoachList();
  const months = upcomingExamMonths(todayInJapan()).map((m) => ({ value: m, label: examMonthLabel(m) }));
  const unconfirmed = list.filter((s) => s.unconfirmed).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {unconfirmed > 0 ? `未確認のノートがある道場生：${unconfirmed}人。` : "未確認のノートはありません。"}
        デモでは、たくやくんのノートを確認できます（ほかの道場生は表示だけ）。
      </p>
      <ul className="space-y-2">
        {list.map((s) => (
          <li key={s.slug}>
            <Card tone="coach" className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-10 shrink-0 rounded-full border border-black/15"
                  style={{ backgroundColor: beltHex(s.belt?.color ?? null) }}
                />
                <p className="min-w-0 flex-1 font-bold">
                  {s.name}
                  {s.honorific}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {s.grade}・{s.belt?.name ?? "—"}
                  </span>
                </p>
                {s.unconfirmed ? (
                  <span className="shrink-0 rounded-full bg-shu px-2 py-0.5 text-xs font-bold text-white">未確認</span>
                ) : s.latestNoteDate ? (
                  <span className="shrink-0 text-xs text-muted">確認済み</span>
                ) : null}
              </div>
              <p className="text-sm">
                <span className="text-xs text-muted">次の審査：</span>
                {s.exam ? `${examMonthLabel(s.exam.month)}・${s.exam.target?.name ?? "—"}` : "未定"}
              </p>
              <div className="flex items-start justify-between gap-3">
                <ExamPlanEditor
                  slug={s.slug}
                  name={`${s.name}${s.honorific}`}
                  months={months}
                  targets={s.targets}
                  current={s.exam?.target?.kyu ? { month: s.exam.month, kyu: s.exam.target.kyu } : null}
                />
                {s.slug === DEMO_STUDENT && (
                  <Link href="/coach/review" className="shrink-0 rounded bg-ai px-3 py-1.5 text-sm font-bold text-white">
                    ノートを確認する
                  </Link>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
