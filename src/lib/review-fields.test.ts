import { describe, expect, it } from "vitest";
import demoResponses from "../../data/seed/demo-responses.json";
import { checkSchema, draftSchema } from "./claude/schemas";
import { DELIVERED_FIELDS, toGuardianView, toStudentView } from "./review-fields";

const draft = draftSchema.parse(demoResponses.draft);

describe("承認した final から届けてよい項目だけを取り出す", () => {
  it("保護者にはお便り・自主練・安全だけ", () => {
    const v = toGuardianView(draft);
    expect(Object.keys(v).sort()).toEqual([...DELIVERED_FIELDS.guardian].sort());
    expect(v).not.toHaveProperty("summary");
    expect(v).not.toHaveProperty("criteriaMatch");
    expect(v).not.toHaveProperty("planRevision");
    expect(v).not.toHaveProperty("praise");
  });
  it("道場生には次回テーマの候補だけ", () => {
    const v = toStudentView(draft);
    expect(Object.keys(v)).toEqual([...DELIVERED_FIELDS.student]);
    expect(v.themeCandidates).toEqual(draft.themeCandidates);
  });
  it("到達基準の照合（先生だけが見る）は、どちらにも入らない", () => {
    const all = JSON.stringify([toGuardianView(draft), toStudentView(draft)]);
    for (const c of draft.criteriaMatch) if (c.comment) expect(all).not.toContain(c.comment);
    if (draft.summary) expect(all).not.toContain(draft.summary);
  });
});

describe("デモ応答（「一周したあと」の状態と、Claude が使えないときに使う）", () => {
  it("下書きと点検のデモ応答が、出力の形に合っている", () => {
    expect(() => draftSchema.parse(demoResponses.draft)).not.toThrow();
    expect(() => checkSchema.parse(demoResponses.check)).not.toThrow();
  });
  it("点検のデモ応答は「問題なし」にしない（点検していない下書きが通ったように見えないように）", () => {
    expect(checkSchema.parse(demoResponses.check).ok).toBe(false);
  });
});
