// Claude を呼ぶ共通の入口。5場面はすべてここを通る。
// 守り：デモモード・キーなし・1日の上限・API 障害・断り・形の不一致のときは、保存済みのデモ応答を返す。
// ここは「届け先」を持たない。道場生・保護者に届くかどうかは、指導者の承認（coach_reviews）で決まる。
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, count, eq } from "drizzle-orm";
import { claudeCalls, getDb } from "@/db";
import { getClaudeClient } from "./client";
import { getDemoResponse, type DemoOptions } from "./demo";
import { SCENES, type SceneName } from "./models";
import { sceneSchemas, type SceneOutput } from "./schemas";

type Outcome = (typeof claudeCalls.$inferInsert)["outcome"];

export type CallSceneInput = {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  demo?: DemoOptions;
};

export type CallSceneResult<S extends SceneName> = {
  data: SceneOutput[S];
  source: "claude" | "demo";
  reason?: Exclude<Outcome, "ok">;
};

const DEFAULT_DAILY_LIMIT = 200;

export async function callScene<S extends SceneName>(
  scene: S,
  input: CallSceneInput,
): Promise<CallSceneResult<S>> {
  const config = SCENES[scene];
  const day = todayInJapan();

  const demo = async (reason: Exclude<Outcome, "ok">): Promise<CallSceneResult<S>> => {
    await record({ scene, model: config.model, day, outcome: reason });
    return { data: getDemoResponse(scene, input.demo), source: "demo", reason };
  };

  if (process.env.CLAUDE_MODE === "demo") return demo("demo_mode");

  const client = getClaudeClient();
  if (!client) return demo("demo_nokey");

  if ((await countOkCalls(day)) >= dailyLimit()) return demo("demo_limit");

  try {
    const response = await client.beta.messages.parse(
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
      { timeout: config.timeoutMs },
    );

    const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    if (response.stop_reason === "refusal") {
      await record({ scene, model: config.model, day, outcome: "demo_refusal", ...usage });
      return { data: getDemoResponse(scene, input.demo), source: "demo", reason: "demo_refusal" };
    }
    const parsed = response.parsed_output as SceneOutput[S] | null;
    if (!parsed) {
      console.error(`[claude] ${scene}: 出力が形に合いませんでした（stop_reason=${response.stop_reason}）`);
      await record({ scene, model: config.model, day, outcome: "demo_invalid", ...usage });
      return { data: getDemoResponse(scene, input.demo), source: "demo", reason: "demo_invalid" };
    }
    await record({ scene, model: response.model ?? config.model, day, outcome: "ok", ...usage });
    return { data: parsed, source: "claude" };
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
}

function dailyLimit(): number {
  const n = Number(process.env.CLAUDE_DAILY_LIMIT);
  return Number.isFinite(n) && n >= 0 && process.env.CLAUDE_DAILY_LIMIT !== "" ? n : DEFAULT_DAILY_LIMIT;
}

// 当日（日本時間）に Claude が答えた回数。neon-http は排他制御ができないので、
// 同時に呼ばれると上限を数件こえることがある（デモの規模では許容する）
async function countOkCalls(day: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(claudeCalls)
    .where(and(eq(claudeCalls.day, day), eq(claudeCalls.outcome, "ok")));
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
