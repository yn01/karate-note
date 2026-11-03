// Claude を呼ぶ共通の入口。5場面はすべてここを通る。
// 守り：デモモード・キーなし・1日の上限・API 障害・断り・形の不一致のときは、保存済みのデモ応答を返す。
// ここは「届け先」を持たない。道場生・保護者に届くかどうかは、指導者の承認（coach_reviews）で決まる。
// 画面側の約束：source === "demo" のときは、デモ応答であることを必ず表示する。
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, count, eq, inArray } from "drizzle-orm";
import { claudeCalls, getDb } from "@/db";
import { getClaudeClient } from "./client";
import { getDemoResponse, type DemoOptions } from "./demo";
import { SCENES, type SceneName } from "./models";
import { sceneSchemas, type SceneOutput } from "./schemas";

type Outcome = (typeof claudeCalls.$inferInsert)["outcome"];
type DemoReason = Exclude<Outcome, "ok">;

export type CallSceneInput = {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  demo?: DemoOptions;
};

export type CallSceneResult<S extends SceneName> = {
  data: SceneOutput[S];
  source: "claude" | "demo";
  reason?: DemoReason;
};

const DEFAULT_DAILY_LIMIT = 200;
// 上限に数えるもの：API まで届いた（費用がかかった）呼び出し
const BILLED_OUTCOMES: Outcome[] = ["ok", "demo_refusal", "demo_invalid", "demo_error"];

export async function callScene<S extends SceneName>(
  scene: S,
  input: CallSceneInput,
): Promise<CallSceneResult<S>> {
  const config = SCENES[scene];
  const day = todayInJapan();

  const demo = async (
    reason: DemoReason,
    usage: { inputTokens?: number; outputTokens?: number } = {},
  ): Promise<CallSceneResult<S>> => {
    await record({ scene, model: config.model, day, outcome: reason, ...usage });
    return { data: getDemoResponse(scene, input.demo), source: "demo", reason };
  };

  if (process.env.CLAUDE_MODE === "demo") return demo("demo_mode");

  const client = getClaudeClient();
  if (!client) return demo("demo_nokey");

  // DB が使えず上限を確かめられないときは、呼ばずにデモ応答へ倒す
  let used: number;
  try {
    used = await countBilledCalls(day);
  } catch (error) {
    console.warn("[claude] 上限を確かめられませんでした", error);
    return { data: getDemoResponse(scene, input.demo), source: "demo", reason: "demo_error" };
  }
  if (used >= dailyLimit()) return demo("demo_limit");

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create(
      {
        model: config.model,
        max_tokens: config.maxTokens,
        system: input.system,
        messages: input.messages,
        output_config: {
          effort: config.effort,
          format: betaZodOutputFormat(sceneSchemas[scene]),
        },
        // 断られたら、推奨のモデルでサーバー側がもう一度試す（Opus・Sonnet）
        ...(config.serverFallback
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { timeout: config.timeoutMs, maxRetries: config.maxRetries },
    );
  } catch (error) {
    // 400 など自分の不具合は気づけるようにログを残す（どの場合も画面はデモ応答で続ける）
    if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.AuthenticationError) {
      console.error(`[claude] ${scene}: ${error.status} ${error.message}`);
    } else if (error instanceof Anthropic.RateLimitError) {
      console.warn(`[claude] ${scene}: 混み合っています（429）`);
    } else if (error instanceof Anthropic.APIError) {
      console.warn(`[claude] ${scene}: API エラー ${error.status}`);
    } else {
      console.warn(`[claude] ${scene}: 呼び出しに失敗しました`, error);
    }
    return demo("demo_error");
  }

  const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };

  // 断られた（fallback のモデルも断った）
  if (response.stop_reason === "refusal") return demo("demo_refusal", usage);

  // 形の確認：途中で切れた・JSON でない・スキーマに合わない
  const parsed = parseOutput(scene, response);
  if (!parsed.ok) {
    console.error(`[claude] ${scene}: 出力が形に合いませんでした（${parsed.why}、stop_reason=${response.stop_reason}）`);
    return demo("demo_invalid", usage);
  }

  await record({ scene, model: response.model ?? config.model, day, outcome: "ok", ...usage });
  return { data: parsed.data, source: "claude" };
}

function parseOutput<S extends SceneName>(
  scene: S,
  response: Anthropic.Beta.BetaMessage,
): { ok: true; data: SceneOutput[S] } | { ok: false; why: string } {
  if (response.stop_reason === "max_tokens") return { ok: false, why: "max_tokens で途中まで" };
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text) return { ok: false, why: "本文なし" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, why: "JSON でない" };
  }
  const result = sceneSchemas[scene].safeParse(json);
  return result.success
    ? { ok: true, data: result.data as SceneOutput[S] }
    : { ok: false, why: "スキーマに合わない" };
}

function dailyLimit(): number {
  const raw = process.env.CLAUDE_DAILY_LIMIT?.trim();
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_DAILY_LIMIT;
}

// 当日（日本時間）に API まで届いた回数。neon-http は排他制御ができないので、
// 同時に呼ばれると上限を数件こえることがある（デモの規模では許容する）。
// サーバー側の fallback が働いた呼び出しも1回と数える。
async function countBilledCalls(day: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(claudeCalls)
    .where(and(eq(claudeCalls.day, day), inArray(claudeCalls.outcome, BILLED_OUTCOMES)));
  return row?.n ?? 0;
}

async function record(row: typeof claudeCalls.$inferInsert) {
  try {
    await getDb().insert(claudeCalls).values(row);
  } catch (error) {
    // 記録に失敗しても画面は止めない
    console.warn("[claude] 呼び出しの記録に失敗しました", error);
  }
}

function todayInJapan(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}
