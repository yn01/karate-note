import { Card, SectionTitle } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { beltHex, beltLabel, kataLabel, kidsMonth } from "@/lib/belt-labels";
import type { StudentHome } from "@/lib/queries/student-home";

type Props = {
  road: StudentHome["road"];
  currentId: number | null;
  nextId: number | null;
  nextExam: StudentHome["nextExam"];
};

// 黒帯への道のり：本物の帯の色を並べる。いまの帯＝藍の枠（いちばん目立たせる）、次の目標＝小さな札
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
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-3 rounded-xl px-2 py-1 ${isCurrent ? "border-2 border-ai bg-ai/5 py-2" : ""} ${
                !isCurrent && !isNext ? "text-muted" : ""
              }`}
            >
              <span
                aria-hidden
                className="h-2.5 w-20 shrink-0 rounded-full border border-black/15"
                style={{ backgroundColor: beltHex(b.color) }}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${isCurrent || isNext ? "font-bold" : ""}`}>
                  <F>{beltLabel(b)}</F>
                  {isCurrent && <span className="sr-only">（いまの帯）</span>}
                </p>
                {isNext && b.kata && (
                  <p className="text-xs text-muted">
                    <F>{`{審査|しんさ}の{形|かた}：${kataLabel(b.kata)}`}</F>
                  </p>
                )}
                {isNext && nextExam && (
                  <p className="text-xs text-muted">
                    <F>{`${kidsMonth(nextExam.dueDate)}の{審査|しんさ}`}</F>
                  </p>
                )}
              </div>
              {isNext && (
                <span className="shrink-0 rounded-full border border-ai/50 px-2 py-0.5 text-[11px] font-bold text-ai">
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
