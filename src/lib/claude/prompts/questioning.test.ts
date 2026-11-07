import { describe, expect, it } from "vitest";
import type { QuestionTurn } from "@/db/schema";
import type { QuestioningContext } from "../context/questioning";
import { DISTRESS, isBigWord, isHardToSay, MAX_QUESTIONS, questioningMessages } from "./questioning";

const ctx: QuestioningContext = {
  note: { date: "2026-11-01", theme: "平安二段", good: "さいごまでできた", improve: "力強くする" },
  pastNotes: [],
  plan: null,
  coachWords: null,
  skills: [],
} as unknown as QuestioningContext;
const q = (text: string): QuestionTurn => ({ role: "claude", type: "open", text, choices: [] });
const a = (text: string): QuestionTurn => ({ role: "student", text });
const lastPrompt = (turns: QuestionTurn[]) => String(questioningMessages(ctx, turns)[0].content);

describe("isHardToSay（言葉にしにくそうな答え）", () => {
  it("「わからない」など・記号だけ・前と同じ答え", () => {
    for (const x of ["わからない", "わかんない", "とくにない", "？", "…", "おぼえてない", "なんとなく"]) expect(isHardToSay(x), x).toBe(true);
    expect(isHardToSay("うけのところ", "うけのところ")).toBe(true);
  });
  it("短くても中身のある答え、長い答えは当てはまらない", () => {
    for (const x of ["うけ", "手", "3", "はい", "うけのところ", "わからなかったけど受けが強くなった"]) expect(isHardToSay(x), x).toBe(false);
  });
});

describe("isBigWord（大きなことばだけの答え）", () => {
  it("「たくさん練習をする」「もっとがんばる」「力強くする」など、答え全体が大きなことばだけ", () => {
    for (const x of ["たくさん練習をする", "たくさんれんしゅうする", "もっと練習する", "練習", "練習？", "もっとがんばる", "がんばる。", "がんばる…", "力強くする", "ちからづよくやる", "強くなりたい", "もっとつよくなる", "がんばって練習する", "ちゃんとやる", "もっと大きく"]) expect(isBigWord(x), x).toBe(true);
  });
  it("どこを・どうするが入った答えは当てはまらない", () => {
    for (const x of ["うけのところ", "もっとゆっくりうけたい", "うけをたくさん練習する", "引き手を力強くする", "家で前半を練習する", ""]) expect(isBigWord(x), x).toBe(false);
  });
});

describe("問いかけの指示（選択肢への切り替え）", () => {
  it("大きなことばだけの答えのあとも、続けるなら選択肢で聞くよう指示する", () => {
    const p = lastPrompt([q("どこが気になった？"), a("たくさん練習をする")]);
    expect(p).toContain("大きなことばだけ");
    expect(p).toContain('type "closed"');
    expect(p).toContain("正しい答えや先生の直し方を入れない");
    expect(lastPrompt([q("どこが気になった？"), a("うけのところ")])).not.toContain('type "closed"');
  });
  it("最後の質問で選択肢にするときは、やり方の候補を出さない（場面の候補にする）", () => {
    const p = lastPrompt([q("どこが気になった？"), a("うけのところ"), q("どんな感じだった？"), a("たくさん練習する")]);
    expect(p).toContain('type "closed"');
    expect(p).toContain("やり方や直し方の候補は出さない");
    expect(p).not.toContain("感じ方やようすの選択肢");
  });
  it("大きなことばでも、まとめのときと、つらさが書かれたときは付けない", () => {
    const turns: QuestionTurn[] = [];
    for (let i = 0; i < MAX_QUESTIONS; i++) turns.push(q("しつもん"), a("たくさん練習する"));
    expect(lastPrompt(turns)).not.toContain('type "closed"');
    expect(lastPrompt([q("どこが気になった？"), a("がんばる。でも手がいたい")])).not.toContain('type "closed"');
  });
  it("「わからない」のあとは、続けるなら選択肢で聞くよう指示する。正しい答えを入れない・安全が先", () => {
    const p = lastPrompt([q("どこが気になった？"), a("わからない")]);
    expect(p).toContain('type "closed"');
    expect(p).toContain("正しい答えや先生の直し方を入れない");
    expect(p).toContain("安全の決まりを先に");
  });
  it("最初の質問と、まとめのときは付けない", () => {
    expect(lastPrompt([])).not.toContain('type "closed"');
    const turns: QuestionTurn[] = [];
    for (let i = 0; i < MAX_QUESTIONS; i++) turns.push(q("しつもん"), a("わからない"));
    expect(lastPrompt(turns)).not.toContain('type "closed"');
  });
  it("つらさが書かれていたら付けない（質問を続けない決まりが先）", () => {
    expect(DISTRESS.test("わからないけど、手がいたい")).toBe(true);
    expect(lastPrompt([q("どこが気になった？"), a("わからないけど、手がいたい")])).not.toContain('type "closed"');
  });
});
