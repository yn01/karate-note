// アプリ（サーバー）から使う DB。クライアントのコードからは読み込めない。
import "server-only";
import { createDb, type Db } from "./client";

let cached: Db | undefined;

export function getDb(): Db {
  cached ??= createDb();
  return cached;
}

export * from "./schema";
