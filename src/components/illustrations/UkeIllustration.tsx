// 手本のイラスト：受けの前の予備動作あり・なし（線画。人物は特定できない形）。
// 先生が確かめて、必要なら差し替える
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

  return (
    <figure className="space-y-1 text-center">
      <svg viewBox="0 0 160 170" role="img" aria-labelledby={`uke-${kind}-t uke-${kind}-d`} className="mx-auto w-full max-w-[180px]">
        <title id={`uke-${kind}-t`}>{title}</title>
        <desc id={`uke-${kind}-d`}>{desc}</desc>
        <defs>
          <marker id={`arrow-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={color} />
          </marker>
        </defs>

        {/* 床 */}
        <line x1="10" y1="160" x2="150" y2="160" stroke="#d9cfb8" strokeWidth="2" />

        {/* 人物（前屈立ち。顔はかかない） */}
        <g stroke={SUMI} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="78" cy="30" r="12" fill="#fffdf7" />
          <line x1="78" y1="42" x2="80" y2="95" />
          {/* 脚 */}
          <polyline points="80,95 108,122 118,158" />
          <polyline points="80,95 58,128 40,158" />
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
            <path d="M40,46 C30,20 70,8 112,40" stroke={color} strokeWidth="3" fill="none" markerEnd={`url(#arrow-${kind})`} />
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
            <path d="M126,74 L124,52" stroke={color} strokeWidth="3" fill="none" markerEnd={`url(#arrow-${kind})`} />
          </>
        )}
      </svg>
      <figcaption className="text-sm font-bold" style={{ color }}>
        {title}
      </figcaption>
      <p className="text-xs text-muted">{desc}</p>
    </figure>
  );
}
