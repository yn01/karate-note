// 下書きの内容のハッシュ。DB の jsonb はキーの順番を変えるので、キーを並べ替えてから計算する
import "server-only";
import { createHash } from "node:crypto";

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export function hashDraft(d: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonical(d))).digest("hex");
}
