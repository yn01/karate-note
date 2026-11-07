import { connection } from "next/server";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { FuriganaToggle } from "@/components/ui/FuriganaToggle";
import { getThemeChoice } from "@/lib/queries/theme-choice";
import { ThemeChooser } from "./ThemeChooser";

const DEMO_STUDENT = "takuya";

export default function ThemePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PageTitle>
          <F>{"{次|つぎ}のテーマを{選|えら}ぼう"}</F>
        </PageTitle>
        <FuriganaToggle />
      </div>
      <Suspense
        fallback={<Loading kids />}
      >
        <Choice />
      </Suspense>
    </div>
  );
}

async function Choice() {
  await connection();
  const data = await getThemeChoice(DEMO_STUDENT);
  if (!data || data.candidates.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="text-center text-sm leading-loose">
          <F>
            {
              "{先生|せんせい}が{準備|じゅんび}しているよ。もう{少|すこ}し{待|ま}ってね。"
            }
          </F>
        </Card>
        <LinkButton href="/student" variant="secondary">
          ホームへ
        </LinkButton>
      </div>
    );
  }
  return (
    <ThemeChooser
      reviewId={data.reviewId}
      candidates={data.candidates}
      chosen={data.chosen}
    />
  );
}
