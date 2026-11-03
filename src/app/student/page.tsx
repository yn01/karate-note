import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { BeltRoad } from "@/components/BeltRoad";
import { kidsDay } from "@/lib/belt-labels";
import { getStudentHome } from "@/lib/queries/student-home";

// デモの主役（架空の道場生）
const DEMO_STUDENT = "takuya";

export default function StudentHomePage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-ink/60">よみこみちゅう…</p>}>
      <StudentHome />
    </Suspense>
  );
}

async function StudentHome() {
  await connection(); // DB の最新の値を、アクセスのたびに読む
  const home = await getStudentHome(DEMO_STUDENT);
  if (!home) {
    console.error(`道場生 ${DEMO_STUDENT} が DB にありません。npm run db:seed を実行してください。`);
    return <p className="py-10 text-center text-sm">まだ じゅんびが できていないよ。</p>;
  }
  const { student, road, current, next, theme, nextExam } = home;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{student.name}{student.honorific}、こんにちは</h1>

      <section aria-labelledby="theme" className="rounded-2xl border-2 border-ink bg-white p-5 shadow-sm">
        <h2 id="theme" className="text-sm font-bold text-ink/70">
          きょうの テーマ{theme ? `（${kidsDay(theme.forDate)}）` : ""}
        </h2>
        <p className="mt-2 text-2xl font-bold leading-snug">{theme?.text ?? "まだ きまっていないよ"}</p>
      </section>

      <Link
        href="/student/note"
        className="block w-full rounded-2xl bg-ink py-4 text-center text-lg font-bold text-white"
      >
        📷 ノートを とる
      </Link>
      <Link
        href="/student/question"
        className="block w-full rounded-2xl border-2 border-ink bg-white py-3 text-center font-bold"
      >
        ふりかえりの しつもん
      </Link>

      <BeltRoad road={road} currentId={current?.id ?? null} nextId={next?.id ?? null} nextExam={nextExam} />
    </div>
  );
}
