import { parseFurigana } from "@/lib/furigana";

// {漢字|よみ} を <ruby> にする。React の要素だけで組むので、任意の HTML は出さない。
// 読み上げでは「今日きょう」と重ならないよう、漢字だけの文を別に持ち、見た目の ruby は読み上げから外す
export function F({ children }: { children: string }) {
  const parts = parseFurigana(children);
  if (!parts.some((p) => p.reading)) return <>{children}</>;
  return (
    <>
      <span className="sr-only">{parts.map((p) => p.text).join("")}</span>
      <span aria-hidden="true">
        {parts.map((p, i) =>
          p.reading ? (
            <ruby key={i}>
              {p.text}
              <rt>{p.reading}</rt>
            </ruby>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </span>
    </>
  );
}
