// 審査の回（年4回：5・8・11・2月）。先生が審査予定を選ぶときの選択肢
import belts from "../../data/seed/belts.json";

export const EXAM_MONTHS: number[] = belts.examMonths;

// 今月をふくめて、これからの審査の回を count 回（"YYYY-MM-01"）
export function upcomingExamMonths(today: string, count = 6): string[] {
  const [ty, tm] = today.split("-").map(Number);
  const out: string[] = [];
  for (let y = ty; out.length < count && y < ty + 5; y++) {
    for (const m of [...EXAM_MONTHS].sort((a, b) => a - b)) {
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
