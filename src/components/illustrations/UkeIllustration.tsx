// 手本のイラスト：受けの前の予備動作あり・なし（線画。人物は特定できない形）。
// 先生が確かめて、必要なら差し替える。立ち方は描かない（腕の動きだけを示す）
import { useId } from "react";

type Props = { kind: "with" | "without" };

const SUMI = "#22252b";
const SHU = "#b8322a";
const AI = "#1f3a63";

export function UkeIllustration({ kind }: Props) {
  const withPre = kind === "with";
  const title = withPre ? "予備動作あり" : "予備動作なし";
  const desc = withPre
    ? "受けの前に、腕をいったんうしろへ大きく振ってから受けている。"
    : "構えの位置から、腕をまっすぐ受けの位置へ動かしている。";
  const color = withPre ? SHU : AI;
  const uid = useId();
  const titleId = `${uid}-t`;
  const descId = `${uid}-d`;
  const arrowId = `${uid}-arrow`;

  return (
    <figure className="space-y-1 text-center">
      <svg
        viewBox="0 0 160 170"
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="mx-auto w-full max-w-[180px]"
      >
        <title id={titleId}>{title}</title>
        <desc id={descId}>{desc}</desc>
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={color} />
          </marker>
        </defs>

        {/* 床 */}
        <line
          x1="10"
          y1="160"
          x2="150"
          y2="160"
          stroke="#d9cfb8"
          strokeWidth="2"
        />

        {/* 人物（立ち方は決めない。顔はかかない） */}
        <g
          stroke={SUMI}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <circle cx="78" cy="30" r="12" fill="#fffdf7" />
          <line x1="78" y1="42" x2="80" y2="95" />
          {/* 脚 */}
          <polyline points="80,95 96,126 102,158" />
          <polyline points="80,95 64,126 58,158" />
          {/* 引き手（腰に引いた腕） */}
          <polyline points="78,55 62,72 70,90" />
          {/* 受けの腕（受けた位置） */}
          <polyline points="78,55 104,62 118,48" />
        </g>

        {withPre ? (
          <>
            {/* 受けの前に、腕がうしろへ振れていた位置（うすく） */}
            <polyline
              points="78,55 54,46 36,54"
              stroke={SUMI}
              strokeOpacity="0.3"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="2 6"
            />
            {/* うしろへ大きく回る矢印 */}
            <path
              d="M40,46 C30,20 70,8 112,40"
              stroke={color}
              strokeWidth="3"
              fill="none"
              markerEnd={`url(#${arrowId})`}
            />
          </>
        ) : (
          <>
            {/* 構えの位置（うすく） */}
            <polyline
              points="78,55 102,72 120,80"
              stroke={SUMI}
              strokeOpacity="0.3"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="2 6"
            />
            {/* まっすぐ受けへ */}
            <path
              d="M126,74 L124,52"
              stroke={color}
              strokeWidth="3"
              fill="none"
              markerEnd={`url(#${arrowId})`}
            />
          </>
        )}
      </svg>
      <figcaption
        className="text-sm font-bold"
        style={{ color }}
        aria-hidden="true"
      >
        {title}
      </figcaption>
      <p className="text-xs text-muted" aria-hidden="true">
        {desc}
      </p>
    </figure>
  );
}
