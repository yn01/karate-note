// 手本のイラスト：受けの前の予備動作あり・なし（道着の人物。顔はかかず、だれか特定できない形）。
// 先生が確かめて、必要なら差し替える。立ち方は決めない（腕の動きだけを示す）
import { useId } from "react";

type Props = { kind: "with" | "without" };

const SHU = "#b8322a";
const AI = "#1f3a63";
const GI = "#ffffff";
const GI_LINE = "#b9b4aa";
const GI_SHADE = "#ebe7df";
const SKIN = "#f2cdb0";
const SKIN_LINE = "#d9ab8c";
const HAIR = "#a86f45";
const BELT = "#1c1c1c";

type Pt = [number, number];

// 袖（白い道着）と拳。線を2回重ねて、ふちどりのある太い袖にする
function Arm({ points, ghost = false }: { points: Pt[]; ghost?: boolean }) {
  const d = points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const [fx, fy] = points[points.length - 1];
  return (
    <g opacity={ghost ? 0.35 : 1}>
      <path d={d} stroke={GI_LINE} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={d} stroke={GI} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={fx} cy={fy} r="5.5" fill={SKIN} stroke={SKIN_LINE} strokeWidth="1" />
    </g>
  );
}

function Figure({ blockArm }: { blockArm: Pt[] }) {
  return (
    <g>
      {/* 床の影 */}
      <ellipse cx="80" cy="160" rx="46" ry="6" fill="#000" opacity="0.08" />

      {/* 足（はだし） */}
      <ellipse cx="58" cy="157" rx="9" ry="4" fill={SKIN} stroke={SKIN_LINE} strokeWidth="1" />
      <ellipse cx="102" cy="157" rx="9" ry="4" fill={SKIN} stroke={SKIN_LINE} strokeWidth="1" />

      {/* ズボン */}
      <path
        d="M66,96 L94,96 L108,152 L94,154 L80,112 L66,154 L52,152 Z"
        fill={GI}
        stroke={GI_LINE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* 引き手の腕（腰に引く）。上着より先に描いて、体のうしろに見せる */}
      <Arm
        points={[
          [68, 52],
          [56, 72],
          [64, 88],
        ]}
      />

      {/* 上着 */}
      <path d="M66,48 Q80,44 94,48 L97,98 Q80,102 63,98 Z" fill={GI} stroke={GI_LINE} strokeWidth="1.5" strokeLinejoin="round" />
      {/* えり */}
      <path d="M72,47 L84,80 M88,47 L76,72" stroke={GI_LINE} strokeWidth="1.5" fill="none" />
      <path d="M70,60 Q72,80 66,96" stroke={GI_SHADE} strokeWidth="3" fill="none" />

      {/* 帯（黒帯） */}
      <rect x="62" y="86" width="36" height="7" rx="1.5" fill={BELT} />
      <path d="M78,92 L72,110 L76,111 L80,94 L86,112 L90,110 L82,92 Z" fill={BELT} />
      <rect x="76" y="85" width="8" height="9" rx="2" fill={BELT} />

      {/* 首と頭（顔はかかない） */}
      <rect x="76" y="38" width="8" height="10" fill={SKIN} />
      <circle cx="80" cy="28" r="12" fill={SKIN} stroke={SKIN_LINE} strokeWidth="1" />
      <path d="M68,27 Q68,14 80,14 Q92,14 92,27 Q88,20 80,20 Q72,20 68,27 Z" fill={HAIR} />
      <circle cx="80" cy="10" r="5.5" fill={HAIR} />

      {/* 受けの腕 */}
      <Arm points={blockArm} />
    </g>
  );
}

const BLOCK_ARM: Pt[] = [
  [92, 52],
  [114, 60],
  [120, 38],
];

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
        viewBox="0 -6 160 176"
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
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={color} />
          </marker>
        </defs>

        {/* 受けの前の腕の位置（うすく） */}
        {withPre ? (
          <Arm
            ghost
            points={[
              [92, 52],
              [70, 66],
              [48, 60],
            ]}
          />
        ) : (
          <Arm
            ghost
            points={[
              [92, 52],
              [104, 72],
              [118, 80],
            ]}
          />
        )}

        <Figure blockArm={BLOCK_ARM} />

        {/* 腕の動き */}
        {withPre ? (
          <path
            d="M44,52 C30,-2 104,-8 120,28"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            markerEnd={`url(#${arrowId})`}
          />
        ) : (
          <path
            d="M132,78 L131,44"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            markerEnd={`url(#${arrowId})`}
          />
        )}
      </svg>
      <figcaption className="text-sm font-bold" style={{ color }} aria-hidden="true">
        {title}
      </figcaption>
      <p className="text-xs text-muted" aria-hidden="true">
        {desc}
      </p>
    </figure>
  );
}
