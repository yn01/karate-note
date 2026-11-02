import { beltHex, beltKidsLabel, kidsMonth } from "@/lib/belt-labels";
import type { StudentHome } from "@/lib/queries/student-home";

type Props = {
  road: StudentHome["road"];
  currentId: number | null;
  nextId: number | null;
  nextExam: StudentHome["nextExam"];
};

// 黒帯への道のり（白帯 → 10級 … 1級 → 黒帯）と現在地
export function BeltRoad({ road, currentId, nextId, nextExam }: Props) {
  const currentOrder = road.find((b) => b.id === currentId)?.order ?? -1;

  return (
    <section aria-labelledby="road" className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 id="road" className="text-lg font-bold">
        くろおびへの みちのり
      </h2>
      <ol className="mt-4">
        {road.map((b, i) => {
          const isCurrent = b.id === currentId;
          const isNext = b.id === nextId;
          const done = b.order < currentOrder;
          const last = i === road.length - 1;
          return (
            <li key={b.id} className="relative flex gap-3 pb-3">
              {!last && (
                <span
                  aria-hidden
                  className={`absolute top-6 left-[11px] h-full w-0.5 ${done || isCurrent ? "bg-ink" : "bg-ink/15"}`}
                />
              )}
              <span
                aria-hidden
                className={`relative z-[1] mt-0.5 size-6 shrink-0 rounded-full border-2 ${
                  isCurrent ? "border-ink ring-4 ring-amber-300" : "border-ink/40"
                }`}
                style={{ backgroundColor: beltHex(b.color) }}
              />
              <div
                className={`flex-1 rounded-xl px-3 py-1.5 ${
                  isCurrent ? "bg-amber-100" : isNext ? "bg-sky-50" : ""
                }`}
              >
                <p className={`text-sm ${isCurrent || isNext ? "font-bold" : done ? "text-ink/50" : "text-ink/80"}`}>
                  {beltKidsLabel(b)}
                  {isCurrent && (
                    <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-xs text-white">いまここ</span>
                  )}
                  {isNext && (
                    <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-xs text-white">つぎの めあて</span>
                  )}
                </p>
                {/* 形は、いま練習している次の審査の課題だけ出す */}
                {b.kata && isNext && <p className="text-xs text-ink/70">しんさの かた：{b.kata}</p>}
                {isNext && nextExam && (
                  <p className="text-xs text-ink/70">{kidsMonth(nextExam.dueDate)}の しんさ</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
