// Anthropic のクライアント。API キーはサーバー側の環境変数だけで読む。
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | undefined;

// キーがなければ null（呼び出し側はデモ応答に切り替える）。null は保存しないので、あとからキーを足しても効く
export function getClaudeClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  // 再試行の回数は場面ごとに呼び出し側で決める
  cached ??= new Anthropic({ maxRetries: 0 });
  return cached;
}
