import { Card, Hanko, SectionTitle } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { beltHex, beltLabel, kataLabel, kidsMonth } from "@/lib/belt-labels";
import type { StudentHome } from "@/lib/queries/student-home";

type Props = {
  road: StudentHome["road"];
  currentId: number | null;
  nextId: number | null;
  nextExam: StudentHome["nextExam"];
};

// 黒帯への道のり：本物の帯の色を並べる。いまここ＝朱印、次の目標＝藍の枠
export function BeltRoad({ road, currentId, nextId, nextExam }: Props) {
  return (
    <Card aria-labelledby="road">
      <SectionTitle id="road">
        <F>{"{黒帯|くろおび}への{道|みち}のり"}</F>
      </SectionTitle>
      <ol className="space-y-2">
        {road.map((b) => {
          const isCurrent = b.id === currentId;
          const isNext = b.id === nextId;
          return (
            <li
              key={b.id}
              className={`flex items-center gap-3 px-2 py-1 ${isNext ? "border border-ai" : ""} ${
                !isCurrent && !isNext ? "opacity-60" : ""
              }`}
            >
              <span
                aria-hidden
                className="h-2.5 w-20 shrink-0 border border-black/15"
                style={{ backgroundColor: beltHex(b.color) }}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${isCurrent || isNext ? "font-bold" : ""}`}>
                  <F>{beltLabel(b)}</F>
                </p>
                {isNext && b.kata && (
                  <p className="text-xs text-muted">
                    <F>{`{審査|しんさ}の{形|かた}：${kataLabel(b.kata)}`}</F>
                    {nextExam && (
                      <>
                        {" ／ "}
                        <F>{`${kidsMonth(nextExam.dueDate)}の{審査|しんさ}`}</F>
                      </>
                    )}
                  </p>
                )}
              </div>
              {isCurrent && (
                <Hanko>
                  いま
                  <br />
                  ここ
                </Hanko>
              )}
              {isNext && (
                <span className="shrink-0 border border-ai px-1.5 py-0.5 text-[11px] font-bold text-ai">
                  <F>{"つぎの{目標|もくひょう}"}</F>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
