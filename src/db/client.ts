// DB への接続（Neon の HTTP ドライバ）。サーバー側でもスクリプトからでも使う。
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL がありません。.env.local に設定してください（.env.example を参照）。");
  }
  return drizzle(neon(url), { schema });
}

export type Db = ReturnType<typeof createDb>;
