"use server";
// スプラッシュ画面の「デモを戻す」。ログインがないので、審査員が触ったあとに戻せるようにする。
// 戻しても、届くのは先生が承認した final だけ（一周したあとの状態も、承認済みのものとして入れる）
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { seedAll, seedDemoDone } from "@/db/seed-core";

export type ResetResult = { ok: true; mode: "start" | "done" } | { ok: false; message: string };

export async function resetDemo(mode: "start" | "done"): Promise<ResetResult> {
  if (mode !== "start" && mode !== "done") return { ok: false, message: "戻し方を選んでください" };
  try {
    const db = getDb();
    if (mode === "start") await seedAll(db);
    else await seedDemoDone(db);
  } catch (err) {
    console.error("デモを戻せませんでした", err);
    return { ok: false, message: "戻せませんでした。もう一度押してください（最初に全部消してから入れ直します）。" };
  }
  revalidatePath("/", "layout");
  return { ok: true, mode };
}
