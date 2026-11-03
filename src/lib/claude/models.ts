// Claude を呼ぶ5場面のモデル設定（モデル名はここ1か所にまとめる。README の表と同じ）
// Opus 5.5 / Sonnet 5.5 / Haiku 5.5 は思考を止められないので、速さは effort で調整する。
export type SceneName = "noteReading" | "oneOnOne" | "questioning" | "draft" | "check";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type SceneConfig = {
  label: string; // 画面やログに出す名前
  model: string;
  effort: Effort;
  maxTokens: number;
  timeoutMs: number;
  // 断られたとき（refusal）に server-side fallback を使うか。Haiku は対象外
  serverFallback: boolean;
};

export const SCENES: Record<SceneName, SceneConfig> = {
  noteReading: {
    label: "1 ノートの読み取り",
    model: "claude-opus-5-5", // 手書きの画像を読む力
    effort: "low",
    maxTokens: 4000,
    timeoutMs: 60_000,
    serverFallback: true,
  },
  oneOnOne: {
    label: "2 1対1のことばの整理",
    model: "claude-haiku-5-5", // 短いテキストの整理。速さ優先
    effort: "low",
    maxTokens: 4000,
    timeoutMs: 30_000,
    serverFallback: false,
  },
  questioning: {
    label: "3 問いかけ",
    model: "claude-sonnet-5-5", // 子どもを待たせない＋答えを教えない指示を守る力
    effort: "low",
    maxTokens: 4000,
    timeoutMs: 30_000,
    serverFallback: true,
  },
  draft: {
    label: "4 下書き",
    model: "claude-opus-5-5", // 育成計画と形の知見を踏まえて考える
    effort: "high",
    maxTokens: 16000,
    timeoutMs: 180_000,
    serverFallback: true,
  },
  check: {
    label: "5 点検",
    model: "claude-opus-5-5", // 下書きとは別の呼び出しで点検する
    effort: "medium",
    maxTokens: 8000,
    timeoutMs: 120_000,
    serverFallback: true,
  },
};
