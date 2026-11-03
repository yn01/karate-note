import { parseFurigana } from "@/lib/furigana";

// {漢字|よみ} を <ruby> にする。React の要素だけで組むので、任意の HTML は出さない
export function F({ children }: { children: string }) {
  return (
    <>
      {parseFurigana(children).map((p, i) =>
        p.reading ? (
          <ruby key={i}>
            {p.text}
            <rt>{p.reading}</rt>
          </ruby>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
