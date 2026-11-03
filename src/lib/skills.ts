// 指導者の知見（skills/*.md）を読む。中身は指導者が書き、Claude は場面ごとにプロンプトへ読み込む。
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type Skill = { path: string; body: string };

const SKILLS_DIR = join(process.cwd(), "skills");
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
  const template = await loadTemplateLines();
  const lines = dropSections(raw.split("\n"), opts.excludeSections ?? [])
    .map((l) => l.replace(/（例：[^）]*）/g, ""))
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
