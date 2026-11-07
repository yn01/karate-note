import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, PageTitle, SectionTitle } from "@/components/ui";
import { draftSchema, fillDraftDefaults } from "@/lib/claude/schemas";
import { hashDraft } from "@/lib/draft-hash";
import { stripFurigana } from "@/lib/furigana";
import { loadKataKnowledge } from "@/lib/kata";
import { getCoachReview } from "@/lib/queries/coach-review";
import demoInputs from "../../../../data/seed/demo-inputs.json";
import { CriteriaEditor } from "./CriteriaEditor";
import { DraftEditor } from "./DraftEditor";
import { OneOnOneEditor } from "./OneOnOneEditor";

// 下書きの呼び出し（最長 150秒）に余裕をもたせる。下書きと点検は別の呼び出し
export const maxDuration = 200;

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
  const [data, kata] = await Promise.all([getCoachReview(DEMO_STUDENT), loadKataKnowledge("heian-nidan")]);
  if (!data) return <Card tone="coach">まだノートがありません。</Card>;
  const { note, oneOnOne, road, plan, criteria, review, questioningSummary } = data;
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
          <Row label="問いかけのまとめ" value={questioningSummary} />
        </dl>
      </Card>
      <OneOnOneEditor
        date={note.date}
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

      <Card tone="coach" aria-labelledby="plan" className="space-y-3 text-sm">
        <SectionTitle id="plan">黒帯への道のりと育成計画</SectionTitle>
        <div>
          <p className="text-xs font-bold text-muted">道場共通：黒帯への道のり</p>
          <p>
            いまの帯：{road.current?.name ?? "—"}　→　次の目標：{road.next?.name ?? "—"}
            {road.next?.kata ? `（審査の形：${road.next.kata}）` : ""}
          </p>
        </div>
        {plan ? (
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted">一人ひとり：育成計画</p>
            <dl className="space-y-1">
              <Row label="本人の目標" value={plan.selfGoals.map(stripFurigana).join("／")} />
              <Row label="保護者の願い" value={plan.guardianWish} />
              <Row label="今期の重点" value={plan.focus} />
              <Row label="強み" value={plan.strengths.join("／")} />
            </dl>
            <p className="pt-1 text-xs font-bold text-muted">マイルストーン（SMART）</p>
            <ul className="space-y-1">
              {plan.milestones.map((m) => (
                <li key={m.dueLabel}>
                  <span className="font-bold">{m.dueLabel}</span>：{m.description}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted">育成計画はまだありません。</p>
        )}
      </Card>

      <CriteriaEditor criteria={criteria} />

      <DraftEditor
        noteId={note.id}
        steps={(kata?.steps ?? []).map((s) => ({ no: s.no, label: `${s.stance}・${s.technique}` }))}
        criteria={criteria}
        saved={reviewProps(review)}
      />
    </div>
  );
}

// 編集の出発点：承認のあとに下書きを作り直していればその下書き、なければ承認した内容、なければ下書き
function reviewProps(review: NonNullable<Awaited<ReturnType<typeof getCoachReview>>>["review"]) {
  if (!review) return null;
  const approved = review.status === "approved";
  const newer =
    approved && !!review.draft && !!review.draftUpdatedAt && !!review.approvedAt && review.draftUpdatedAt > review.approvedAt;
  const raw = (newer ? review.draft : (review.final ?? review.draft)) ?? null;
  if (!raw) return null;
  // 古い下書きに残った項目（手本 model など）を捨ててから使う（点検・承認のハッシュとそろえる）
  const parsed = draftSchema.safeParse(fillDraftDefaults(raw));
  const base = parsed.success ? parsed.data : raw;
  const hash = hashDraft(base);
  return {
    base,
    check: review.checkResult,
    checkCurrent: !!review.checkHash && review.checkHash === hash,
    approved,
    newerThanApproval: newer,
  };
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
