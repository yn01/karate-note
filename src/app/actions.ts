"use server";
// スプラッシュ画面の「デモを戻す」。ログインがないので、審査員が触ったあとに戻せるようにする。
// 戻しても、届くのは先生が承認した final だけ（一周したあとの状態も、承認済みのものとして入れる）
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { seedAll, seedDemoDone } from "@/db/seed-core";

const COOLDOWN_SECONDS = 30;

export type ResetResult = { ok: true; mode: "start" | "done" } | { ok: false; message: string };

export async function resetDemo(mode: "start" | "done"): Promise<ResetResult> {
  if (mode !== "start" && mode !== "done") return { ok: false, message: "戻し方を選んでください" };
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, message: "戻せませんでした（DB の設定がありません）" };

  // 続けて押されたら断る（ほかの人の操作を何度も消さない・DB を使いすぎない）。確かめると同時に記録する
  const claimed = await getDb().execute(sql`
    INSERT INTO demo_resets (id, last_at) VALUES (1, now())
    ON CONFLICT (id) DO UPDATE SET last_at = now()
      WHERE demo_resets.last_at < now() - make_interval(secs => ${COOLDOWN_SECONDS})
    RETURNING id`);
  if (claimed.rows.length === 0) return { ok: false, message: "さっき戻したばかりです。少し待ってから押してください。" };

  // 全部消して入れ直すまでを1つのトランザクションに（途中で失敗したら元のまま。同時に押されても順番に）
  const pool = new Pool({ connectionString: url });
  try {
    await drizzle(pool, { schema }).transaction(async (tx) => {
      if (mode === "start") await seedAll(tx);
      else await seedDemoDone(tx);
    });
  } catch (err) {
    console.error("デモを戻せませんでした", err);
    return { ok: false, message: "戻せませんでした。少し待ってから、もう一度押してください。" };
  } finally {
    await pool.end();
  }
  revalidatePath("/", "layout");
  return { ok: true, mode };
}
