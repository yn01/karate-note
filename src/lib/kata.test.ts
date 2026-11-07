import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import demo from "../../data/seed/demo-responses.json";
import { basisIsValid, hasVerdict, KATA_COMPARE_SYSTEM, kataCompareMessages } from "./claude/prompts/kata-compare";
import { kataCompareSchema, type KataCompare } from "./claude/schemas";
import { KATA, knowledgeItems, parseKataKnowledge } from "./kata";

const raw = readFileSync(join(import.meta.dirname, "../../skills/kata/heian-nidan.md"), "utf8");
const k = parseKataKnowledge(KATA[0], raw)!;
const step1 = k.steps[0];
const items = knowledgeItems(k, step1);
const img = { mediaType: "image/jpeg" as const, base64: "AAAA" };
const out = (lookAt: string[], cheer = "", basis = ["point"]): KataCompare => ({ photoUsable: true, lookAt, cheer, basis });

describe("形の知見の読み取り（平安二段）", () => {
  it("21挙動のポイント、4つの要点、つまずきと直し方、保護者が見るポイントを読む", () => {
    expect(k.steps.map((s) => s.no)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    expect(step1).toMatchObject({ stance: "左 猫足立ち", technique: "左 打ち落とし" });
    expect(step1.point).toContain("円を描くように");
    expect(k.keyPoints).toHaveLength(4);
    expect(k.stumbles.length).toBeGreaterThanOrEqual(3);
    expect(k.stumbles.every((s) => s.stumble && s.fix)).toBe(true);
    expect(k.guardianTip).toContain("どうだった");
  });
  it("先生が確かめる前の下書き（先頭の印）は読まない", () => {
    expect(parseKataKnowledge(KATA[0], `<!-- 下書き：先生が確かめる前 -->\n${raw}`)).toBeNull();
  });
});

describe("形の見比べ（場面6）の原則", () => {
  const text = JSON.stringify(kataCompareMessages(k, step1, { model: img, practice: img }));
  it("到達基準（段階のことば）は渡さない。知見は ID 付きで渡す", () => {
    expect(text).not.toContain("ときどきできる");
    expect(text).not.toContain("安定してできる");
    expect(text).not.toContain("到達基準");
    for (const it of items) expect(text).toContain(`id=\\"${it.id}\\"`);
  });
  it("知見の中から選ぶ・出来を判定しない・写真の形を言い切らない・見張らせない、をプロンプトで守る", () => {
    expect(KATA_COMPARE_SYSTEM).toContain("知見にない直し方");
    expect(KATA_COMPARE_SYSTEM).toContain("出来の判定をしない");
    expect(KATA_COMPARE_SYSTEM).toContain("写真の子どもの形がどうなっているかは書かない");
    expect(KATA_COMPARE_SYSTEM).toContain("見張る・採点する役をさせない");
  });
  it("判定のことば・ほめる/惜しむことば・写真の形を言い切る文は止める", () => {
    for (const s of [
      "左ひじが曲がっていて、できていません",
      "受けは正しい形です",
      "きれいに受けられています",
      "もう少しで手本どおりです",
      "写真では左ひじが曲がっています",
      "写真の腕は頭の上に上がっています",
    ])
      expect(hasVerdict(out([s])), s).toBe(true);
  });
  it("見比べるところを伝える文は止めない", () => {
    for (const s of [
      "手本では、左ひじを曲げずに円をえがくように受けています。写真の左ひじと見比べてみてください",
      "2点を見比べてみてください",
      "姿勢が前へたおれないか、動画で一緒に見てみてください",
      "手本では、おへそが東を向いています。写真のおへその向きと見比べてみてください",
      "受けを正確にするには、止まった形で一度確かめます",
    ])
      expect(hasVerdict(out([s])), s).toBe(false);
  });
  it("もとにした知見の ID は、渡した知見のものだけ", () => {
    expect(basisIsValid(out(["x"], "", ["point", "stumble1"]), items)).toBe(true);
    expect(basisIsValid(out(["x"], "", []), items)).toBe(false);
    expect(basisIsValid(out(["x"], "", ["made-up"]), items)).toBe(false);
    expect(basisIsValid({ photoUsable: false, lookAt: [], cheer: "撮り直してください", basis: [] }, items)).toBe(true);
  });
  it("デモ応答は形がそろっていて、判定のことばがなく、知見から選んでいる", () => {
    const d = kataCompareSchema.parse(demo.kataCompare);
    expect(d.lookAt.length).toBeGreaterThanOrEqual(1);
    expect(d.lookAt.length).toBeLessThanOrEqual(2);
    expect(hasVerdict(d)).toBe(false);
    expect(basisIsValid(d, items)).toBe(true);
  });
});

describe("お便りの「見てほしいところ」から見比べへ", () => {
  it("デモの下書きで先生が選んだ挙動は、知見の挙動にある", () => {
    const step = demo.draft.guardianLetter.compareStep;
    expect(step).toBeGreaterThan(0);
    expect(k.steps.some((s) => s.no === step)).toBe(true);
  });
});
