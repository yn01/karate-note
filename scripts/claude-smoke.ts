// Claude の呼び出しの土台を確かめる（npm run claude:smoke）
// 1) 本物で1回（場面2：1対1のことばの整理） 2) CLAUDE_MODE=demo 3) 上限0
// 本物の呼び出しは1回だけ（費用はごくわずか）。プロンプトは仮で、本番のものは T06 で作る。
import demoInputs from "../data/seed/demo-inputs.json";
import { callScene } from "../src/lib/claude/call";

const system =
  "あなたは空手道場の指導者の助手です。指導者が稽古のあとに話したことばを、指摘・本人の気づき・来週の宿題・保護者に伝えたいことに分けて、短い日本語で整理します。話されていないことは足しません。";
const input = {
  system,
  messages: [{ role: "user" as const, content: demoInputs.oneOnOne.transcript }],
};

async function main() {
  const real = await callScene("oneOnOne", input);
  console.log("1) 本物:", real.source, real.reason ?? "", JSON.stringify(real.data, null, 2));

  process.env.CLAUDE_MODE = "demo";
  const demoMode = await callScene("oneOnOne", input);
  console.log("2) デモモード:", demoMode.source, demoMode.reason);
  delete process.env.CLAUDE_MODE;

  process.env.CLAUDE_DAILY_LIMIT = "0";
  const limited = await callScene("questioning", { ...input, demo: { turn: 1 } });
  console.log("3) 上限0:", limited.source, limited.reason, limited.data.text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
