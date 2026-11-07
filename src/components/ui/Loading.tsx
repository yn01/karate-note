// 読み込み中の表示：縦書きの「空手ノート」を、書き順どおりに一画ずつ筆で書くように描き、くり返す。
// 書き終えたら少し置いて一斉に消える。動きを減らす設定のときは、書き終えた形で止める。
// どの画面も同じ見た目（文字は出さず、読み上げだけ「読み込み中」）。
// 一画ずつの線は、このアプリのために手で描いた中心線（100×100 のます目。縦に5字並べる）

// 1字ずつの画（書き順どおり）
const GLYPHS: string[][] = [
  // 空（8画）
  [
    "M50 6 L54 16",
    "M21 22 L19 33",
    "M21 22 L80 22 Q82 23 77 33",
    "M43 30 Q39 41 27 48",
    "M57 30 Q63 41 75 46",
    "M30 58 L70 58",
    "M50 58 L50 86",
    "M17 88 L83 88",
  ],
  // 手（4画）
  ["M72 8 Q52 17 27 19", "M26 39 L74 39", "M15 61 L85 61", "M50 19 L50 88 Q50 95 41 90"],
  // ノ（1画）
  ["M64 12 Q60 58 24 88"],
  // ー（縦書きなので縦の線）
  ["M50 12 L50 88"],
  // ト（2画）
  ["M40 10 L40 90", "M42 40 L67 54"],
];

const CYCLE = 5; // 秒
const PER_STROKE = 0.2; // 1画にかける秒
const pct = (sec: number) => ((sec / CYCLE) * 100).toFixed(2);

// 画ごとの keyframes（書き始めの時刻をずらし、消えるのは全部そろえる）
const css =
  GLYPHS.flat()
    .map((_, k) => {
      const start = k * PER_STROKE;
      const end = start + PER_STROKE;
      return `@keyframes kn-stroke-${k}{0%,${pct(start)}%{stroke-dashoffset:1;opacity:1}${pct(end)}%,80%{stroke-dashoffset:0;opacity:1}92%,100%{stroke-dashoffset:0;opacity:0}}.kn-stroke-${k}{animation:kn-stroke-${k} ${CYCLE}s ease-in-out infinite}`;
    })
    .join("") +
  "@media (prefers-reduced-motion: reduce){.kn-stroke{animation:none!important;stroke-dashoffset:0!important}}";

export function Loading() {
  let k = 0;
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-8">
      <style>{css}</style>
      {/* 縦書きの字は飾り（読み上げない）。読み上げは下の文 */}
      <svg aria-hidden viewBox="0 0 100 500" className="h-48 w-10 text-sumi" fill="none">
        {GLYPHS.map((strokes, i) => (
          <g key={i} transform={`translate(0 ${i * 100})`}>
            {strokes.map((d) => {
              const n = k++;
              return (
                <path
                  key={n}
                  d={d}
                  pathLength={1}
                  className={`kn-stroke kn-stroke-${n}`}
                  stroke="currentColor"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={1}
                  strokeDashoffset={1}
                />
              );
            })}
          </g>
        ))}
      </svg>
      <p className="sr-only">読み込み中</p>
    </div>
  );
}
