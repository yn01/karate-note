import { connection } from "next/server";
import { Suspense } from "react";
import { BeltRoad } from "@/components/BeltRoad";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { FuriganaToggle } from "@/components/ui/FuriganaToggle";
import { kidsDay } from "@/lib/belt-labels";
import { todayInJapan } from "@/lib/dates";
import { getStudentHome } from "@/lib/queries/student-home";
import { GoalEditor } from "./GoalEditor";

// デモの主役（架空の道場生）
const DEMO_STUDENT = "takuya";

export default function StudentHomePage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">読み込み中…</p>}>
      <StudentHome />
    </Suspense>
  );
}

async function StudentHome() {
  await connection(); // DB の最新の値を、アクセスのたびに読む
  const home = await getStudentHome(DEMO_STUDENT);
  if (!home) {
    console.error(`道場生 ${DEMO_STUDENT} が DB にありません。npm run db:seed を実行してください。`);
    return (
      <p className="py-10 text-center text-sm">
        <F>{"まだ{準備|じゅんび}ができていません。"}</F>
      </p>
    );
  }
  const { student, road, current, next, theme, nextExam, selfGoals } = home;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <PageTitle>
          {student.name}
          {student.honorific}、こんにちは
        </PageTitle>
        <FuriganaToggle />
      </div>

      <Card aria-labelledby="theme">
        <p id="theme" className="text-xs text-muted">
          <F>{`${theme && theme.forDate > todayInJapan() ? "{次|つぎ}の{稽古|けいこ}のテーマ" : "{今日|きょう}のテーマ"}${theme ? `　${kidsDay(theme.forDate)}` : ""}`}</F>
        </p>
        <p className="font-mincho mt-1 text-2xl leading-loose font-extrabold">
          {theme ? <F>{theme.text}</F> : <F>{"まだ{決|き}まっていません"}</F>}
        </p>
      </Card>

      <div className="space-y-2">
        <LinkButton href="/student/note">
          <F>{"ノートを{取|と}りこむ"}</F>
        </LinkButton>
        <LinkButton href="/student/question" variant="secondary">
          <F>{"ふりかえりの{質問|しつもん}"}</F>
        </LinkButton>
        <LinkButton href="/student/theme" variant="secondary">
          <F>{"{次|つぎ}のテーマを{選|えら}ぶ"}</F>
        </LinkButton>
      </div>

      {selfGoals && <GoalEditor initial={selfGoals} />}

      <BeltRoad road={road} currentId={current?.id ?? null} nextId={next?.id ?? null} nextExam={nextExam} />
    </div>
  );
}
