// 日本時間の今日（YYYY-MM-DD）。ページでは connection() の後に呼ぶ
export function todayInJapan(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export type DateProblem = "missing" | "invalid" | "future" | "tooOld";

// 正しい暦の日付で、今日（日本時間）から1年前までの日だけを受け付ける。だめなら理由の種類を返す（文言は画面ごとに決める）
export function checkPastDate(date: string): DateProblem | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return "missing";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "invalid";
  const today = todayInJapan();
  if (date > today) return "future";
  if (date < oneYearAgo(today)) return "tooOld";
  return null;
}

export function oneYearAgo(today = todayInJapan()): string {
  const [ty, tm, td] = today.split("-").map(Number);
  return new Date(Date.UTC(ty - 1, tm - 1, td)).toISOString().slice(0, 10);
}

// 次の稽古の日（稽古は日曜）。strict なら、その日が日曜でも次の週の日曜
function nextSunday(from: string, strict: boolean): string {
  const [y, m, d] = from.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const add = (7 - dt.getUTCDay()) % 7;
  dt.setUTCDate(dt.getUTCDate() + (strict && add === 0 ? 7 : add));
  return dt.toISOString().slice(0, 10);
}

// ノートの稽古のあとの、次の稽古の日。もう過ぎていたら、今日から見た次の稽古の日（今日が日曜なら今日）
export function themeDateAfter(noteDate: string, today = todayInJapan()): string {
  const after = nextSunday(noteDate, true);
  return after < today ? nextSunday(today, false) : after;
}
