import { connection } from "next/server";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { Card, PageTitle } from "@/components/ui";
import { kataOptions } from "@/lib/kata";
import { DateSelect } from "@/components/DateSelect";
import { dateParam } from "@/lib/date-param";
import { getGuardianLetter, listLetterDates } from "@/lib/queries/guardian-letter";
import { KataCompare } from "./KataCompare";

// デモの主役（架空の道場生）の保護者
const DEMO_STUDENT = "takuya";

export default function ParentPage({ searchParams }: PageProps<"/parent">) {
  return (
    <div className="space-y-4">
      <div>
        <PageTitle>今週のお便り</PageTitle>
        <p className="text-xs text-muted">選手を支える人へ</p>
      </div>
      <Suspense
        fallback={<Loading />}
      >
        <Letter searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Letter({ searchParams }: { searchParams: PageProps<"/parent">["searchParams"] }) {
  await connection();
  const date = dateParam((await searchParams).date);
  const [data, katas, dates] = await Promise.all([
    getGuardianLetter(DEMO_STUDENT, date).then((l) => l ?? (date ? getGuardianLetter(DEMO_STUDENT) : null)),
    kataOptions(),
    listLetterDates(DEMO_STUDENT),
  ]);
  if (!data) {
    return (
      <div className="space-y-4">
        <Card tone="parent" className="text-center text-sm text-muted">
          今週のお便りは、先生が準備しています。
        </Card>
        <Section title="手本と見比べる">
          <KataCompare katas={katas} />
        </Section>
      </div>
    );
  }
  const { studentName, noteDate, approvedAt, letter } = data;
  const [, m, d] = noteDate.split("-").map(Number);
  const approved = approvedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
      }).format(new Date(approvedAt))
    : null;
  const g = letter.guardianLetter;
  // 先生が選んだ挙動（手本の写真がある挙動だけ）。古いお便りには無いことがある
  const step = katas.find((k) => k.slug === "heian-nidan")?.steps.find((s) => s.no === (g.compareStep ?? 0));
  const suggested = step?.modelPhoto ? step.no : undefined;

  return (
    <div className="space-y-4">
      <DateSelect dates={dates} current={noteDate} label="お便りの日" />
      <Card tone="parent" className="space-y-3">
        <p className="text-sm">
          <span className="font-bold">{studentName}</span>の{m}月{d}日の稽古
        </p>
        {g.coachWords && (
          <blockquote className="font-mincho border-l-4 border-wakatake pl-3 text-lg leading-relaxed">
            {g.coachWords}
          </blockquote>
        )}
        {approved && (
          <p className="inline-block rounded-md bg-kinari px-2 py-1 text-xs font-bold text-muted">{approved}に先生が送りました</p>
        )}
      </Card>

      {g.watchPoints.length > 0 && (
        <Section title="今週見てほしいところ">
          <ul className="list-disc space-y-1 pl-5">
            {g.watchPoints.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* 先生が選んだ挙動を、見てほしいところのすぐ下で見比べる（先生の判断・手本・知見がそろう） */}
      <Section title={suggested ? `手本と見比べる（先生が選んだ挙動：${suggested}挙動目）` : "手本と見比べる"}>
        <KataCompare katas={katas} suggestedStep={suggested} />
      </Section>

      {g.cheerHints.length > 0 && (
        <Section title="声かけのヒント">
          <ul className="space-y-1">
            {g.cheerHints.map((x, i) => (
              <li key={i}>・{x}</li>
            ))}
          </ul>
        </Section>
      )}

      {g.effort && (
        <Section title="稽古での頑張り">
          <p>{g.effort}</p>
        </Section>
      )}

      {letter.homePractice.length > 0 && (
        <Section title="家でできる自主練">
          <ul className="space-y-3">
            {letter.homePractice.map((h, i) => (
              <li key={i} className="space-y-1">
                <p>{h.menu}</p>
                <p className="text-sm text-muted">この練習の狙い：{h.aim}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {letter.safety.length > 0 && (
        <Section title="安全のために">
          <ul className="space-y-1">
            {letter.safety.map((x, i) => (
              <li key={i}>・{x}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card tone="parent" className="space-y-2">
      <h2 className="font-mincho text-base font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}
