"use server";
// 保護者の画面：形の見比べ（場面6）。練習の写真は Claude に送るだけで、どこにも保存しない。
// 先生が書いた知見から選んだものだけを出す（判定のことばが入っていたり、知見の ID がおかしければ出さない）。
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { callScene } from "@/lib/claude/call";
import { basisIsValid, hasVerdict, KATA_COMPARE_SYSTEM, kataCompareMessages } from "@/lib/claude/prompts/kata-compare";
import type { KataCompare } from "@/lib/claude/schemas";
import { detectImageType, MAX_IMAGE_BYTES, type ImageType } from "@/lib/images";
import { hasModelPhoto, knowledgeItems, loadKataKnowledge, modelPhotoPath, PRACTICE_SAMPLE } from "@/lib/kata";

export type CompareResult =
  | {
      ok: true;
      stepNo: number;
      result: KataCompare;
      basis: { label: string; text: string }[]; // もとにした先生の知見（原文）
      source: "claude" | "demo";
    }
  | { ok: false; message: string };

type Image = { mediaType: ImageType; base64: string };

// 見本の写真はいつも同じなので、Claude が一度見比べられたら結果を使い回す（費用と上限を守る）
let sampleResult: KataCompare | undefined;

export async function compareKata(formData: FormData): Promise<CompareResult> {
  const slug = String(formData.get("kata") ?? "");
  const stepNo = Number(formData.get("step"));
  const kind = formData.get("kind");

  const knowledge = await loadKataKnowledge(slug);
  const step = knowledge?.steps.find((s) => s.no === stepNo);
  if (!knowledge || !step) return { ok: false, message: "形と挙動を選び直してください。" };
  if (!(await hasModelPhoto(slug, step.no))) return { ok: false, message: "この挙動の先生の手本は、まだありません。" };
  const items = knowledgeItems(knowledge, step);
  const done = (result: KataCompare, source: "claude" | "demo"): CompareResult => ({
    ok: true,
    stepNo: step.no,
    result,
    basis: items.filter((i) => result.basis.includes(i.id)).map(({ label, text }) => ({ label, text })),
    source,
  });

  const isSample = kind === "sample" && slug === PRACTICE_SAMPLE.slug && step.no === PRACTICE_SAMPLE.step;
  let practice: Image;
  if (isSample) {
    if (sampleResult) return done(sampleResult, "claude");
    // 見本はサーバーにある画像を使う（送られてきたものは使わない）
    const img = await readPublicImage(PRACTICE_SAMPLE.path);
    if (!img) return { ok: false, message: "見本の写真を読めませんでした。" };
    practice = img;
  } else if (kind === "photo") {
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: "写真が見つかりません。" };
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "写真が大きすぎます。" };
    const bytes = Buffer.from(await file.arrayBuffer());
    // 申告された種類ではなく、中身の先頭で確かめる
    const mediaType = detectImageType(bytes);
    if (!mediaType) return { ok: false, message: "この写真は読めません。" };
    practice = { mediaType, base64: bytes.toString("base64") };
  } else {
    return { ok: false, message: "写真を選び直してください。" };
  }

  const model = await readPublicImage(modelPhotoPath(slug, step.no));
  if (!model) return { ok: false, message: "この挙動の手本を読めませんでした。" };

  const input = { system: KATA_COMPARE_SYSTEM, messages: kataCompareMessages(knowledge, step, { model, practice }) };
  // 判定のことばが入っていたり、知見から選んでいなければ、1回だけ作り直す
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callScene("kataCompare", input);
    if (res.source === "demo") {
      // デモ応答は、見本の写真（平安二段の1挙動目）のためのもの。ほかの写真には出さない
      if (!isSample) return { ok: false, message: "いまは見比べられません。少し時間をおいて、もう一度ためしてください。" };
      return done(res.data, "demo");
    }
    const out = tidy(res.data);
    if (hasVerdict(out) || !basisIsValid(out, items) || (out.photoUsable && out.lookAt.length === 0)) {
      console.warn("[kata-compare] 判定のことば・知見の ID・空の結果のため、出しません", { attempt });
      continue;
    }
    if (isSample && out.photoUsable) sampleResult = out;
    return done(out, "claude");
  }
  return { ok: false, message: "うまく見比べられませんでした。もう一度ためしてください。" };
}

// 数と長さをそろえる（1〜2つ、長すぎる文は切る）
function tidy(r: KataCompare): KataCompare {
  return {
    photoUsable: r.photoUsable,
    lookAt: r.lookAt.slice(0, 2).map((s) => s.slice(0, 140)),
    cheer: r.cheer.slice(0, 140),
    basis: r.basis.slice(0, 3),
  };
}

async function readPublicImage(path: string): Promise<Image | null> {
  try {
    const bytes = await readFile(join(process.cwd(), "public", path));
    const mediaType = detectImageType(bytes);
    if (!mediaType) throw new Error("種類を判定できない");
    return { mediaType, base64: bytes.toString("base64") };
  } catch (error) {
    console.error("[kata-compare] 画像を読めません", path, error);
    return null;
  }
}
