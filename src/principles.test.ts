// 設計の原則をソースで守るテスト：承認前のもの（下書き・点検）を道場生・保護者の画面に出す経路を作らない
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
function files(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(join(root, p)).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [p] : [];
  });
}
const read = (p: string) => readFileSync(join(root, p), "utf8");

// 道場生・保護者の画面と、その画面のための問い合わせ
const audienceFiles = [
  ...files("src/app/student"),
  ...files("src/app/parent"),
  ...["student-home", "theme-choice", "guardian-letter", "latest-note"].map((n) => `src/lib/queries/${n}.ts`),
];

describe("承認前のものを道場生・保護者に届けない", () => {
  it("下書き・点検の結果・先生だけが見る項目を読まない", () => {
    const forbidden = ["coachReviews.draft", "checkResult", "checkHash", "criteriaMatch", "planRevision", "draftUpdatedAt"];
    for (const f of audienceFiles) {
      const src = read(f);
      for (const word of forbidden) expect(src.includes(word), `${f} に ${word}`).toBe(false);
    }
  });

  it("final を読むところは、承認済みで絞り、届ける項目の関数を通す", () => {
    const readers = audienceFiles.filter((f) => read(f).includes("coachReviews.final"));
    expect(readers.length).toBeGreaterThan(0);
    for (const f of readers) {
      const src = read(f);
      expect(src, `${f} が承認済みで絞っていない`).toMatch(/eq\(coachReviews\.status,\s*"approved"\)/);
      expect(src, `${f} が届ける項目の関数を通していない`).toMatch(/to(Guardian|Student)View\(/);
    }
  });
});

describe("ことば", () => {
  it("画面に「型」と書かない（「形」と書く）", () => {
    for (const f of [...files("src/app"), ...files("src/components")]) {
      expect(read(f).includes("型"), `${f} に「型」`).toBe(false);
    }
  });
});
