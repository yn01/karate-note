// 指導者の知見（skills/*.md）を読む。中身は指導者が書き、Claude は場面ごとにプロンプトへ読み込む。
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type Skill = { path: string; body: string };

const SKILLS_DIR = join(process.cwd(), "skills");
// 先頭の「<!-- 下書き」の行（空白のゆれも見る）
export const DRAFT_MARK = /^\uFEFF?\s*<!--\s*下書き/;
let templateLines: Set<string> | undefined;

type LoadOptions = {
  // 渡さない節の見出し（例：問いかけでは「到達基準」を外す。段階のことばを子どもに使わないため）
  excludeSections?: string[];
};

// まだテンプレートのまま（空欄だけ）なら null を返し、プロンプトに入れない。
// 入れるときも、テンプレートと同じ行と「（例：…）」の書き方の説明は取り除く（例を知見と取り違えないため）
export async function loadSkill(relPath: string, opts: LoadOptions = {}): Promise<Skill | null> {
  let raw: string;
  try {
    raw = await readFile(join(SKILLS_DIR, relPath), "utf8");
  } catch {
    return null;
  }
  // 先生が確かめる前の下書き（先頭の印）は、プロンプトに入れない。印を消すと読み込まれる
  if (DRAFT_MARK.test(raw)) {
    if (process.env.NODE_ENV !== "production") console.info(`[skills] 下書きのため読み込みません：skills/${relPath}`);
    return null;
  }
  const template = await loadTemplateLines();
  const cleaned = raw
    .replace(/<!--[\s\S]*?-->/g, "") // コメント
    .replace(/<!--[\s\S]*$/, ""); // 閉じていないコメントから後ろ
  const lines = dropSections(cleaned.split("\n"), opts.excludeSections ?? [])
    // テンプレートの書き方の説明（（例：…））と、まだ埋めていない空欄（（先生が書く：…））は入れない
    .map((l) => l.replace(/（例：[^）]*）/g, "").replace(/（先生が書く：[^）]*）/g, ""))
    .filter((l) => !/^\s*下書き：/.test(l))
    .filter((l) => !/^\s*[-*]\s*$/.test(l))
    .filter((l) => !template.has(norm(l)) || isStructural(l));

  const written = lines.filter((l) => !isStructural(l) && norm(l)).join("").length;
  if (written < 80) return null;
  return { path: `skills/${relPath}`, body: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}

async function loadTemplateLines(): Promise<Set<string>> {
  templateLines ??= new Set(
    (await readFile(join(SKILLS_DIR, "kata", "_template.md"), "utf8").catch(() => ""))
      .split("\n")
      .map(norm)
      .filter((l) => l && !isStructural(l)),
  );
  return templateLines;
}

// 見出し・引用・表の区切りは構造として残す（本文の量には数えない）
function isStructural(line: string): boolean {
  const l = line.trim();
  return !l || l.startsWith("#") || l.startsWith(">") || /^[|\-\s:]+$/.test(l);
}

// 「## 4. 到達基準…」のような見出しから、次の同じ深さの見出しまでを外す
function dropSections(lines: string[], names: string[]): string[] {
  if (names.length === 0) return lines;
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const h = /^##\s+(.*)$/.exec(line.trim());
    if (h) skipping = names.some((n) => h[1].includes(n));
    if (!skipping) out.push(line);
  }
  return out;
}

function norm(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}
