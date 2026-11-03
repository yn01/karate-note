// 指導者の知見（skills/*.md）を読む。中身は指導者が書き、Claude は場面ごとにプロンプトへ読み込む。
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type Skill = { path: string; body: string };

// まだテンプレートのまま（空欄だけ）なら null を返し、プロンプトに入れない
export async function loadSkill(relPath: string): Promise<Skill | null> {
  let body: string;
  try {
    body = await readFile(join(SKILLS_DIR, relPath), "utf8");
  } catch {
    return null;
  }
  return (await writtenChars(body)) >= 80 ? { path: `skills/${relPath}`, body: body.trim() } : null;
}

const SKILLS_DIR = join(process.cwd(), "skills");
let templateLines: Set<string> | undefined;

// テンプレート（skills/kata/_template.md）にない行の文字数。見出し・引用・表の区切りは数えない
async function writtenChars(md: string): Promise<number> {
  templateLines ??= new Set(
    (await readFile(join(SKILLS_DIR, "kata", "_template.md"), "utf8").catch(() => "")).split("\n").map(norm),
  );
  return md
    .split("\n")
    .map(norm)
    .filter((l) => l && !l.startsWith("#") && !l.startsWith(">") && !/^[|\-\s:]+$/.test(l) && !templateLines!.has(l))
    .join("").length;
}

function norm(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}
