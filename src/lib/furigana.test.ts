import { describe, expect, it } from "vitest";
import { clampFurigana, cleanFurigana, parseFurigana, plainStudentText, stripFurigana } from "./furigana";

describe("parseFurigana", () => {
  it("{漢字|よみ} を読み付きに分ける", () => {
    expect(parseFurigana("{受|う}けの{始|はじ}まり")).toEqual([
      { text: "受", reading: "う" },
      { text: "けの" },
      { text: "始", reading: "はじ" },
      { text: "まり" },
    ]);
  });
  it("ひらがな以外の読みは出さない（小さな文字で別の内容を入れられないように）", () => {
    expect(parseFurigana("{受|Click here}け")).toEqual([{ text: "受" }, { text: "け" }]);
    expect(parseFurigana("{受|うけうけうけうけうけうけうけうけうけうけう}")).toEqual([{ text: "受" }]);
  });
  it("印がなければそのまま", () => {
    expect(parseFurigana("ひらがなだけ")).toEqual([{ text: "ひらがなだけ" }]);
  });
});

describe("stripFurigana", () => {
  it("読みを外して漢字だけ残す", () => {
    expect(stripFurigana("{引|ひ}き{手|て}を{意識|いしき}してみる")).toBe("引き手を意識してみる");
  });
});

describe("clampFurigana", () => {
  it("読みを外した長さで切り、印を壊さない", () => {
    const s = "{受|う}けの{始|はじ}まり";
    expect(clampFurigana(s, 10)).toBe(s);
    expect(clampFurigana(s, 3)).toBe("{受|う}けの");
    const cut = clampFurigana(s, 4);
    expect(stripFurigana(cut).length).toBeLessThanOrEqual(4);
    expect(cut).not.toMatch(/\{[^}]*$/); // 開いたままの印がない
  });
});

describe("plainStudentText", () => {
  it("道場生の文から印の文字を取りのぞく（入れ子の印も残らない）", () => {
    expect(plainStudentText("{{目標|x}|もくひょう}")).toBe("目標xもくひょう");
    expect(parseFurigana(plainStudentText("{受|う}け")).some((p) => p.reading)).toBe(false);
  });
});

describe("cleanFurigana（Claude の出力の印の書きそこない）", () => {
  it("正しい印は残し、書きそこないは取りのぞく", () => {
    expect(cleanFurigana("{思|おも}い{出|だ}すのに{time|}かかった")).toBe("{思|おも}い{出|だ}すのにかかった");
    expect(cleanFurigana("{受|う}けのとき")).toBe("{受|う}けのとき");
    expect(cleanFurigana("{受|Click}け")).toBe("受け");
    expect(cleanFurigana("少し{時間|}かかった")).toBe("少し時間かかった");
  });
  it("書きそこないの中の数字・々・句読点は残す", () => {
    expect(cleanFurigana("{2}挙動目")).toBe("2挙動目");
    expect(cleanFurigana("{9級|}の{人々|}")).toBe("9級の人々");
    expect(cleanFurigana("{時間、すこし|}")).toBe("時間、すこし");
  });
  it("閉じていない印は、読みを文に混ぜない", () => {
    expect(cleanFurigana("{受|う けのとき")).toBe("受 けのとき");
  });
  it("2回かけても同じ。切ったあとに開いたままの印が残らない", () => {
    for (const x of ["{思|おも}い{time|}", "{2}挙動目", "{受|う けの", "{受|う}けの{始|はじ}まり"]) {
      const once = cleanFurigana(x);
      expect(cleanFurigana(once)).toBe(once);
      expect(clampFurigana(once, 3)).not.toMatch(/\{[^}]*$/);
    }
  });
});
