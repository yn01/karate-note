// Anthropic のクライアント。API キーはサーバー側の環境変数だけで読む。
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null | undefined;

// キーがなければ null（呼び出し側はデモ応答に切り替える）
export function getClaudeClient(): Anthropic | null {
  if (cached !== undefined) return cached;
  cached = process.env.ANTHROPIC_API_KEY ? new Anthropic({ maxRetries: 2 }) : null;
  return cached;
}
