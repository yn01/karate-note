// 日本時間の今日（YYYY-MM-DD）。ページでは connection() の後に呼ぶ
export function todayInJapan(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

// 正しい暦の日付で、今日（日本時間）から1年前までの日だけを受け付ける。だめなら理由（ふりがなの書き方）を返す
export function checkPastDate(date: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return "{日付|ひづけ}を{入|い}れてね";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return "{日付|ひづけ}を{確|たし}かめてね";
  }
  const today = todayInJapan();
  const [ty, tm, td] = today.split("-").map(Number);
  const oneYearAgo = new Date(Date.UTC(ty - 1, tm - 1, td)).toISOString().slice(0, 10);
  if (date > today) return "まだ{来|き}ていない{日|ひ}は{選|えら}べません";
  if (date < oneYearAgo) return "1{年|ねん}より{前|まえ}の{日|ひ}は{選|えら}べません";
  return null;
}
