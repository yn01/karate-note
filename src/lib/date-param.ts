// 画面の ?date=YYYY-MM-DD を受け取る（形が合わなければ使わない＝最新を出す）
export function dateParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}
