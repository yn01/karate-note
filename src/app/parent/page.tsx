import { connection } from "next/server";
import { Suspense } from "react";
import { UkeIllustration } from "@/components/illustrations/UkeIllustration";
import { Card, Hanko, PageTitle } from "@/components/ui";
import { getGuardianLetter } from "@/lib/queries/guardian-letter";

// デモの主役（架空の道場生）の保護者
const DEMO_STUDENT = "takuya";

export default function ParentPage() {
  return (
    <div className="space-y-4">
      <div>
        <PageTitle>今週のお便り</PageTitle>
        <p className="text-xs text-muted">アントラージュ（選手を支える人）へ</p>
      </div>
      <Suspense fallback={<p className="py-10 text-center text-sm text-muted">読み込み中…</p>}>
        <Letter />
      </Suspense>
    </div>
  );
}

async function Letter() {
  await connection();
  const data = await getGuardianLetter(DEMO_STUDENT);
  if (!data) {
    return (
      <Card tone="parent" className="text-center text-sm text-muted">
        今週のお便りは、先生が準備しています。
      </Card>
    );
  }
  const { studentName, noteDate, approvedAt, letter } = data;
  const [, m, d] = noteDate.split("-").map(Number);
  const approved = approvedAt
    ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(new Date(approvedAt))
    : null;
  const g = letter.guardianLetter;

  return (
    <div className="space-y-4">
      <Card tone="parent" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-bold">{studentName}</span>の{m}月{d}日の稽古
          </p>
          <Hanko size={44}>先生</Hanko>
        </div>
        {g.coachWords && (
          <blockquote className="font-mincho border-l-4 border-wakatake pl-3 text-lg leading-relaxed">{g.coachWords}</blockquote>
        )}
        {approved && <p className="text-xs text-muted">{approved}に先生が確認しました。</p>}
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
        <Section title="日曜の頑張り">
          <p>{g.effort}</p>
        </Section>
      )}

      <Section title="手本">
        {g.model && <p>{g.model}</p>}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <UkeIllustration kind="with" />
          <UkeIllustration kind="without" />
        </div>
        <p className="text-xs text-muted">イラストは動きのイメージです（先生が確かめて差し替えます）。</p>
      </Section>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card tone="parent" className="space-y-2">
      <h2 className="font-mincho text-base font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}
