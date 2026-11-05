import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import checks from "../../data/seed/criteria-checks.json";
import demo from "../../data/seed/demo-responses.json";
import { CRITERIA_POINTS } from "./criteria";

const kata = readFileSync(join(import.meta.dirname, "../../skills/kata/heian-nidan.md"), "utf8");

describe("到達基準のチェック欄は、平安二段の知見とそろっている", () => {
  it("チェック欄の要点は、知見の「2. 形の要点」と「4. 到達基準」の表に同じ順で出てくる", () => {
    expect(kata).toContain("## 2.");
    expect(kata).toContain("## 4.");
    // 「2. 形の要点」の節だけを見る。引用符（”受け” など）は外して比べる
    const points = kata.split("## 2.")[1].split("## 3.")[0].replace(/[”“"「」]/g, "");
    const table = kata.split("## 4.")[1].split("## 5.")[0];
    let lastP = -1;
    let lastT = -1;
    for (const p of CRITERIA_POINTS) {
      const head = p.label.replace(/（.*$/, "");
      const ip = points.indexOf(head);
      const it_ = table.indexOf(`| ${head}`);
      expect(ip, `${p.label} が形の要点にない`).toBeGreaterThan(lastP);
      expect(it_, `${p.label} が到達基準の表にない`).toBeGreaterThan(lastT);
      lastP = ip;
      lastT = it_;
    }
  });
  it("合成データとデモの下書きは、チェック欄の要点だけを使う", () => {
    const label = new Map(CRITERIA_POINTS.map((p) => [p.key, p.label]));
    for (const c of checks.checks) expect(label.get(c.pointKey), c.pointKey).toBe(c.pointLabel);
    expect(demo.draft.criteriaMatch.map((c) => [c.pointKey, c.pointLabel])).toEqual(CRITERIA_POINTS.map((p) => [p.key, p.label]));
  });
});
