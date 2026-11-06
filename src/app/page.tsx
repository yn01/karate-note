import { Card, Hanko, LinkButton } from "@/components/ui";
import { DemoReset } from "./DemoReset";

// スプラッシュ（デモの入口）。審査員が最初に見る画面。DB は読まない
const ROLES = [
  {
    tone: "student" as const,
    who: "道場生",
    color: "text-ai",
    text: "稽古のあと、紙のノートを撮る。Claude が読み取り、答えを教えずに問いかけで、次にためすことを本人が決める。",
  },
  {
    tone: "parent" as const,
    who: "保護者",
    color: "text-wakatake",
    text: "先生が承認したお便りだけが届く。見てほしいところ、声かけのヒント、家でできる安全な自主練。",
  },
  {
    tone: "coach" as const,
    who: "先生",
    color: "text-sumi",
    text: "1対1で話したことは、その場で文字に。育成計画と形の知見をもとに Claude が下書きし、別の Claude が点検。先生が直して承認する。",
  },
];

export default function SplashPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 pt-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <h1 className="font-mincho text-4xl font-extrabold tracking-widest">空手ノート</h1>
          <Hanko size={44}>押忍</Hanko>
        </div>
        <p className="font-mincho text-base leading-relaxed">紙の空手ノートを、道場生・保護者・先生でつなぐ</p>
        <div aria-hidden className="mx-auto h-[3px] w-24 rounded-full bg-sumi" style={{ transform: "skewX(-20deg)" }} />
      </div>

      <div className="space-y-3">
        {ROLES.map((r) => (
          <Card key={r.who} tone={r.tone} className="space-y-1">
            <h2 className={`font-mincho text-lg font-extrabold ${r.color}`}>{r.who}</h2>
            <p className="text-sm leading-relaxed">{r.text}</p>
          </Card>
        ))}
      </div>

      <p className="border-y border-line py-3 text-center text-sm font-bold leading-relaxed">
        Claude は答えを教えません。
        <br />
        保護者へのお便りと次のテーマは、先生が承認したものだけが届きます。
      </p>

      <LinkButton href="/student">はじめる（道場生の画面へ）</LinkButton>
      <p className="text-center text-xs text-muted">上の切り替えバーで、保護者・先生の画面にも移れます。</p>

      <DemoReset />
    </div>
  );
}
