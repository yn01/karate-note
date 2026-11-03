// 審査の回（年4回：5・8・11・2月）。先生が審査予定を選ぶときの選択肢
import belts from "../../data/seed/belts.json";

export const EXAM_MONTHS: number[] = belts.examMonths;

// 今月をふくめて、これからの審査の回を count 回（"YYYY-MM-01"）。審査の日はデータにないので、今月の回も選べる
export function upcomingExamMonths(today: string, count = 6): string[] {
  const [ty, tm] = today.split("-").map(Number);
  const out: string[] = [];
  const sorted = [...EXAM_MONTHS].sort((a, b) => a - b);
  for (let y = ty; out.length < count && y < ty + 5; y++) {
    for (const m of sorted) {
      if (y === ty && m < tm) continue;
      out.push(`${y}-${String(m).padStart(2, "0")}-01`);
      if (out.length >= count) break;
    }
  }
  return out;
}

// "2027-02-01" → "2027年2月"
export function examMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}年${m}月`;
}

// 審査予定がまだ使えるか：目指す帯がいまの帯より上で、審査の月が今月以降
export function isExamPlanActive(
  plan: { examMonth: string; targetOrder: number } | null | undefined,
  currentOrder: number | null | undefined,
  today: string,
): boolean {
  if (!plan || currentOrder == null) return false;
  return plan.targetOrder > currentOrder && plan.examMonth >= `${today.slice(0, 7)}-01`;
}
