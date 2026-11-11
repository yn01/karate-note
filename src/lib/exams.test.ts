import { describe, expect, it } from "vitest";
import { isExamPlanActive, upcomingExamMonths } from "./exams";

describe("upcomingExamMonths（審査は年2回：4・10月）", () => {
  it("今月をふくめて、これからの回を出す", () => {
    expect(upcomingExamMonths("2026-10-04", 3)).toEqual(["2026-10-01", "2027-04-01", "2027-10-01"]);
    expect(upcomingExamMonths("2026-11-04", 2)).toEqual(["2027-04-01", "2027-10-01"]);
    expect(upcomingExamMonths("2027-04-10", 2)).toEqual(["2027-04-01", "2027-10-01"]);
  });
});

describe("isExamPlanActive（先生が決めた審査予定をまだ使うか）", () => {
  const plan = { examMonth: "2027-04-01", targetOrder: 2 };
  it("目指す帯が上で、審査の月が今月以降なら使う", () => {
    expect(isExamPlanActive(plan, 1, "2026-11-04")).toBe(true);
    expect(isExamPlanActive(plan, 1, "2027-04-20")).toBe(true);
  });
  it("昇級したあと・月が過ぎたあとは使わない", () => {
    expect(isExamPlanActive(plan, 2, "2026-11-04")).toBe(false);
    expect(isExamPlanActive(plan, 1, "2027-05-01")).toBe(false);
    expect(isExamPlanActive(null, 1, "2026-11-04")).toBe(false);
  });
});
