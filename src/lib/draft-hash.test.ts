import { describe, expect, it } from "vitest";
import { hashDraft } from "./draft-hash";

describe("hashDraft（点検した内容と承認する内容が同じかを確かめる）", () => {
  it("キーの順番が違っても同じ（DB の jsonb は順番を変える）", () => {
    expect(hashDraft({ a: 1, b: { c: [1, 2], d: "x" } })).toBe(hashDraft({ b: { d: "x", c: [1, 2] }, a: 1 }));
  });
  it("中身が違えば別のハッシュ", () => {
    expect(hashDraft({ a: 1 })).not.toBe(hashDraft({ a: 2 }));
    expect(hashDraft({ list: [1, 2] })).not.toBe(hashDraft({ list: [2, 1] }));
  });
});
