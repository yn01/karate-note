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

// 問い合わせ（src/lib/queries）は、先生だけのもの（coach-*）と、道場生・保護者に出すものに分ける。
// 新しいファイルを足したら、どちらかに入れる（入れないとテストが落ちる）
const COACH_QUERIES = ["coach-list", "coach-review", "exam-plan"];
const AUDIENCE_QUERIES = ["student-home", "theme-choice", "guardian-letter", "latest-note"];

// 道場生・保護者の画面と、その画面のための問い合わせ
const audienceFiles = [
  ...files("src/app/student"),
  ...files("src/app/parent"),
  ...AUDIENCE_QUERIES.map((n) => `src/lib/queries/${n}.ts`),
];

describe("問い合わせの仕分け", () => {
  it("src/lib/queries のファイルは、先生だけか道場生・保護者向けのどちらかに入っている", () => {
    const names = files("src/lib/queries").map((f) => f.split("/").pop()!.replace(/\.ts$/, ""));
    for (const n of names) expect([...COACH_QUERIES, ...AUDIENCE_QUERIES], `${n} が未分類`).toContain(n);
  });
  it("道場生・保護者の画面は、先生だけの問い合わせを読まない", () => {
    for (const f of [...files("src/app/student"), ...files("src/app/parent")]) {
      for (const n of COACH_QUERIES) expect(read(f).includes(`@/lib/queries/${n}`), `${f} が ${n} を読んでいる`).toBe(false);
    }
  });
});

describe("承認前のものを道場生・保護者に届けない", () => {
  it("下書き・点検の結果・先生だけが見る項目を読まない", () => {
    const forbidden = ["coachReviews.draft", "checkResult", "checkHash", "criteriaMatch", "planRevision", "draftUpdatedAt"];
    for (const f of audienceFiles) {
      const src = read(f);
      for (const word of forbidden) expect(src.includes(word), `${f} に ${word}`).toBe(false);
      // 行ごと読む書き方（下書きや点検の結果まで読んでしまう）も使わない
      expect(src, `${f} が coach_reviews を行ごと読んでいる`).not.toMatch(/select\(\)\s*\.from\(coachReviews\)/);
      expect(src, `${f} が coach_reviews を行ごと読んでいる`).not.toMatch(/query\.coachReviews/);
    }
  });

  // ファイルごとに確かめる（1つのファイルに絞った問い合わせと絞っていない問い合わせがあると見逃す。そのときはレビューで見る）
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
  it("画面に「型」と書かない（「形」と書く）。画面に出るデータと知見も", () => {
    const data = readdirSync(join(root, "data/seed")).filter((n) => n.endsWith(".json")).map((n) => `data/seed/${n}`);
    const skills = ["skills", "skills/kata"].flatMap((d) =>
      readdirSync(join(root, d)).filter((n) => n.endsWith(".md")).map((n) => `${d}/${n}`),
    );
    for (const f of [...files("src/app"), ...files("src/components"), ...data, ...skills]) {
      expect(read(f).includes("型"), `${f} に「型」`).toBe(false);
    }
  });
});

describe("保護者・道場生の画面から Claude に直接出すのは、決まった場面だけ", () => {
  it("保護者の画面が呼ぶのは形の見比べ（場面6）だけで、判定のことばと知見の ID を確かめてから出す", () => {
    for (const f of files("src/app/parent")) {
      const src = read(f);
      const scenes = [...src.matchAll(/callScene\(\s*"(\w+)"/g)].map((m) => m[1]);
      for (const sc of scenes) expect(sc, `${f} が ${sc} を呼んでいる`).toBe("kataCompare");
      if (scenes.length > 0) {
        expect(src, `${f} が判定のことばを確かめていない`).toMatch(/hasVerdict\(/);
        expect(src, `${f} が知見の ID を確かめていない`).toMatch(/basisIsValid\(/);
      }
    }
  });
});
