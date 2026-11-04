import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkPastDate, oneYearAgo, themeDateAfter } from "./dates";

describe("themeDateAfter（選んだテーマを、どの稽古の日のものにするか）", () => {
  it("日曜のノートなら、次の週の日曜", () => {
    expect(themeDateAfter("2026-11-01", "2026-11-01")).toBe("2026-11-08");
    expect(themeDateAfter("2026-11-01", "2026-11-04")).toBe("2026-11-08");
  });
  it("ほかの曜日のノートなら、そのあとの日曜", () => {
    expect(themeDateAfter("2026-11-04", "2026-11-04")).toBe("2026-11-08");
  });
  it("その日が過ぎていたら、今日から見た次の稽古の日（今日が日曜なら今日）", () => {
    expect(themeDateAfter("2026-11-01", "2026-11-10")).toBe("2026-11-15");
    expect(themeDateAfter("2026-11-01", "2026-11-15")).toBe("2026-11-15");
  });
  it("月や年をまたぐ", () => {
    expect(themeDateAfter("2026-12-27", "2026-12-27")).toBe("2027-01-03");
  });
});

describe("checkPastDate（今日を 2026-11-04 の日本時間に固定）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T03:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("形や暦がおかしい日付を断る", () => {
    expect(checkPastDate("")).toBe("missing");
    expect(checkPastDate("2026-02-30")).toBe("invalid");
  });
  it("1年前までは受け付け、それより古い日を断る", () => {
    expect(oneYearAgo()).toBe("2025-11-04");
    expect(checkPastDate("2025-11-04")).toBeNull();
    expect(checkPastDate("2025-11-03")).toBe("tooOld");
  });
  it("今日までは受け付け、未来の日を断る", () => {
    expect(checkPastDate("2026-11-04")).toBeNull();
    expect(checkPastDate("2026-11-05")).toBe("future");
  });
});
