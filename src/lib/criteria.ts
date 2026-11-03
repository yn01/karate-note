// 到達基準の要点の一覧（平安二段）。skills/kata/heian-nidan.md の到達基準の表が書かれたら、そちらに合わせる。
// 状態（まだ／ときどき／安定）は先生が付ける。Claude は判定しない。道場生・保護者には段階を見せない。
export type CriteriaStatus = "not_yet" | "sometimes" | "stable";
export const CRITERIA_STATUS_LABEL: Record<CriteriaStatus, string> = {
  not_yet: "まだ",
  sometimes: "ときどきできる",
  stable: "安定してできる",
};

export const KATA = "heian-nidan";

export const CRITERIA_POINTS: { key: string; label: string }[] = [
  { key: "order", label: "順番どおり最後まで通せる" },
  { key: "uke-start", label: "受けの始まり（予備動作がない）" },
];
