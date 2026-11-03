// 日本時間の今日（YYYY-MM-DD）。ページでは connection() の後に呼ぶ
export function todayInJapan(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}
