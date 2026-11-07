import { Card, LinkButton } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { FuriganaToggle } from "@/components/ui/FuriganaToggle";
import { DemoReset } from "./DemoReset";

// スプラッシュ（デモの入口）。審査員が最初に見る画面。DB は読まない。
// 立場ごとに、その人へ話しかける文にする（機能の説明はしない）。子どもも読むので、ふりがなを付ける
const ROLES = [
  {
    tone: "student" as const,
    who: "{道場生|どうじょうせい}",
    color: "text-ai",
    text: "{稽古|けいこ}のあと、ノートを{撮|と}ってみよう。{質問|しつもん}に{答|こた}えながら、{次|つぎ}の{稽古|けいこ}でためすことを、{自分|じぶん}で{決|き}められるよ。",
  },
  {
    tone: "parent" as const,
    who: "{保護者|ほごしゃ}",
    color: "text-wakatake",
    text: "{先生|せんせい}が{確|たし}かめて{送|おく}ったお{便|たよ}りだけが{届|とど}きます。{今週|こんしゅう}{見|み}てほしいところを、{先生|せんせい}の{手本|てほん}と{見比|みくら}べながら、{家|いえ}での{練習|れんしゅう}を{応援|おうえん}してください。",
  },
  {
    tone: "coach" as const,
    who: "{先生|せんせい}",
    color: "text-sumi",
    text: "{稽古|けいこ}のあとの1{対|たい}1を、その{場|ば}で{文字|もじ}に{残|のこ}しましょう。アプリが{下書|したが}きと{点検|てんけん}をするので、{直|なお}してお{便|たよ}りを{送|おく}るだけです。",
  },
];

export default function SplashPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <FuriganaToggle />
      </div>
      <div className="space-y-2 text-center">
        <h1 className="font-mincho text-4xl font-extrabold tracking-widest">
          <F>{"{空手|からて}ノート"}</F>
        </h1>
        <p className="font-mincho text-lg leading-relaxed">
          <F>{"{先生|せんせい}の{声|こえ}を、{道場|どうじょう}の{外|そと}へ"}</F>
        </p>
        <p className="text-xs text-muted">
          <F>{"{道場生|どうじょうせい}・{保護者|ほごしゃ}・{先生|せんせい}をつなぐ、{紙|かみ}のノート"}</F>
        </p>
        <div aria-hidden className="mx-auto h-[3px] w-24 rounded-full bg-shu/80" style={{ transform: "skewX(-20deg)" }} />
      </div>

      <div className="space-y-3">
        {ROLES.map((r) => (
          <Card key={r.who} tone={r.tone} className="space-y-1">
            <h2 className={`font-mincho text-lg font-extrabold ${r.color}`}>
              <F>{r.who}</F>
            </h2>
            <p className="text-sm leading-relaxed">
              <F>{r.text}</F>
            </p>
          </Card>
        ))}
      </div>

      {/* 先生（作者）の想い。なぜ答えを教えないのか */}
      <p className="font-mincho border-y border-line py-4 text-center leading-loose">
        <F>{"{答|こた}えを{教|おし}えてもらうより、{自分|じぶん}で{気|き}づいたことのほうが、ずっと{身|み}につく。"}</F>
        <br />
        <F>{"だから、このノートは{答|こた}えを{教|おし}えません。"}</F>
        <br />
        <F>{"{次|つぎ}にためすことを{決|き}めるのは、きみ{自身|じしん}です。"}</F>
      </p>

      <LinkButton href="/student">はじめる（道場生の画面へ）</LinkButton>
      <p className="text-center text-xs text-muted">上の切り替えバーで、保護者・先生の画面にも移れます。</p>

      <DemoReset />
    </div>
  );
}
