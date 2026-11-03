// 場面4・5 で共通に使う、文脈を文章にする部分
import type { ReviewContext } from "../context/review";

const LABEL = { not_yet: "まだ", sometimes: "ときどきできる", stable: "安定してできる" } as const;
// タグの区切りを崩されないよう、入力の < > を全角にする
export const safe = (s: string) => s.replace(/</g, "＜").replace(/>/g, "＞");

export function reviewContextText(ctx: ReviewContext): string {
  const past = ctx.pastNotes
    .map((n) => `- ${n.date}：テーマ「${safe(n.theme)}」／よかった「${safe(n.good)}」／直したい「${safe(n.improve)}」`)
    .join("\n");
  const q = ctx.questioning
    ? [
        ...ctx.questioning.turns.map((t) => (t.role === "claude" ? `問いかけ役（${t.type ?? "open"}）：${safe(t.text)}` : `本人：${safe(t.text)}`)),
        `本人が確かめたまとめ：${safe(ctx.questioning.summary)}`,
      ].join("\n")
    : "（まだ問いかけをしていない）";
  const oo = ctx.oneOnOne
    ? [
        `先生の文字起こし：${safe(ctx.oneOnOne.transcript)}`,
        ctx.oneOnOne.organized
          ? `先生が確定した整理：指摘＝${safe(ctx.oneOnOne.organized.pointers.join("／"))}　本人の気づき＝${safe(ctx.oneOnOne.organized.selfAwareness.join("／"))}　来週の宿題＝${safe(ctx.oneOnOne.organized.homework.join("／"))}　保護者に伝えたいこと＝${safe(ctx.oneOnOne.organized.toGuardian.join("／"))}`
          : "（整理はまだ先生が確定していない）",
      ].join("\n")
    : "（1対1のことばはまだない）";
  const plan = ctx.plan
    ? [
        `本人の目標：${safe(ctx.plan.selfGoals.join("、"))}`,
        `保護者の願い：${safe(ctx.plan.guardianWish)}`,
        `今期の重点：${safe(ctx.plan.focus)}`,
        `強み：${safe(ctx.plan.strengths.join("、"))}`,
        ...ctx.plan.milestones.map((m) => `マイルストーン（${m.dueLabel}）：${safe(m.description)}`),
      ].join("\n")
    : "（なし）";
  const criteria = ctx.criteria
    .map((c) => `- ${c.key}｜${c.label}｜先生のチェック：${c.status ? LABEL[c.status] : "まだ付けていない"}`)
    .join("\n");

  return `<student>
${safe(ctx.student.name)}（${safe(ctx.student.grade)}）　いまの帯：${safe(ctx.student.belt)}　次の目標の帯：${safe(ctx.student.nextBelt ?? "")}
</student>

<note date="${ctx.note.date}">
今日のテーマ：${safe(ctx.note.theme)}
よかったこと：${safe(ctx.note.good)}
直したいこと：${safe(ctx.note.improve)}
</note>

<past_notes>
${past || "（なし）"}
</past_notes>

<questioning>
${q}
</questioning>

<one_on_one>
${oo}
</one_on_one>

<plan>
${plan}
</plan>

<criteria kata="平安二段">
${criteria}
</criteria>`;
}

export function skillsText(ctx: ReviewContext): string {
  return ctx.skills.map((s) => `<skill path="${s.path}">\n${s.body}\n</skill>`).join("\n\n");
}
