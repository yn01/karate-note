// 到達基準の要点の一覧（平安二段）。skills/kata/heian-nidan.md の「2. 形の要点」「4. 到達基準」と同じ順・同じ名前にする。
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
  { key: "uke", label: "受けを正確に" },
  { key: "stance", label: "腰を落とした立ち方" },
  { key: "embusen", label: "演武線を正確に" },
];
