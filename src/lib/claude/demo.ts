// 保存済みのデモ応答（data/seed/demo-responses.json）。上限超過・障害・断り・デモモードのときに返す。
import demo from "../../../data/seed/demo-responses.json";
import type { SceneName } from "./models";
import { sceneSchemas, type SceneOutput } from "./schemas";

export type DemoOptions = {
  turn?: number; // 問いかけ：何問目か（0 から）
};

export function getDemoResponse<S extends SceneName>(scene: S, opts: DemoOptions = {}): SceneOutput[S] {
  const raw = pickRaw(scene, opts);
  // JSON と型のずれを早く見つけるため、デモ応答も形を検証する
  return sceneSchemas[scene].parse(raw) as SceneOutput[S];
}

function pickRaw(scene: SceneName, opts: DemoOptions): unknown {
  switch (scene) {
    case "noteReading":
      return demo.noteReading;
    case "oneOnOne":
      return demo.oneOnOneOrganized;
    case "questioning": {
      const list = demo.nextQuestions;
      const i = Math.min(Math.max(opts.turn ?? 0, 0), list.length - 1);
      return list[i];
    }
    case "draft":
      return demo.draft;
    case "check":
      return demo.check;
  }
}
