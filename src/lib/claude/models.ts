// Claude を呼ぶ5場面のモデル設定（モデル名はここ1か所にまとめる。README の表と同じ）
// Opus 5.5 / Sonnet 5.5 / Haiku 5.5 は思考を止められないので、速さは effort で調整する。
export type SceneName = "noteReading" | "oneOnOne" | "questioning" | "draft" | "check";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type SceneConfig = {
  label: string; // 画面やログに出す名前
  model: string;
  effort: Effort;
  maxTokens: number;
  timeoutMs: number; // 1回の試行の時間切れ
  // 再試行の回数。待ち時間の最長は timeoutMs ×（maxRetries＋1）。Vercel の関数の上限（300秒）より短くする
  maxRetries: number;
  // 断られたとき（refusal）に server-side fallback を使うか。Haiku は対象外
  serverFallback: boolean;
};

export const SCENES: Record<SceneName, SceneConfig> = {
  noteReading: {
    label: "1 ノートの読み取り",
    model: "claude-opus-5-5", // 手書きの画像を読む力
    effort: "low",
    maxTokens: 4000,
    timeoutMs: 45_000,
    maxRetries: 1,
    serverFallback: true,
  },
  oneOnOne: {
    label: "2 1対1のことばの整理",
    model: "claude-haiku-5-5", // 短いテキストの整理。速さ優先
    effort: "low",
    maxTokens: 4000,
    timeoutMs: 20_000,
    maxRetries: 1,
    serverFallback: false,
  },
  questioning: {
    label: "3 問いかけ",
    model: "claude-sonnet-5-5", // 子どもを待たせない＋答えを教えない指示を守る力
    effort: "low",
    maxTokens: 4000,
    timeoutMs: 20_000,
    maxRetries: 1,
    serverFallback: true,
  },
  draft: {
    label: "4 下書き",
    model: "claude-opus-5-5", // 育成計画と形の知見を踏まえて考える
    effort: "high",
    maxTokens: 16000,
    timeoutMs: 150_000,
    maxRetries: 0,
    serverFallback: true,
  },
  check: {
    label: "5 点検",
    model: "claude-opus-5-5", // 下書きとは別の呼び出しで点検する
    effort: "medium",
    maxTokens: 8000,
    timeoutMs: 90_000,
    maxRetries: 0,
    serverFallback: true,
  },
};
