// 形の見比べ（場面6）で使う、先生が書いた形の知見（skills/kata/*.md）と手本の写真。
// 渡すのは「各挙動のポイント」「形の要点」「よくあるつまずき・癖と直し方」「保護者が見るポイント」だけ。
// 到達基準（まだ／ときどき／安定）の節は渡さない（保護者に出来の段階を見せないため）。
import "server-only";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { DRAFT_MARK } from "@/lib/skills";

export type KataInfo = { slug: string; name: string; file: string };

// いま知見と手本の写真があるのは平安二段だけ（MVP）
export const KATA: KataInfo[] = [{ slug: "heian-nidan", name: "平安二段", file: "kata/heian-nidan.md" }];

export type KataStep = { no: number; stance: string; technique: string; movement: string; point: string };

export type KataKnowledge = {
  kata: KataInfo;
  steps: KataStep[];
  keyPoints: string[]; // 形の要点
  stumbles: { stumble: string; fix: string }[]; // よくあるつまずき・癖と直し方
  guardianTip: string; // 保護者が見るポイント（家での練習の節）
};

const SKILLS_DIR = join(process.cwd(), "skills");

export function findKata(slug: string): KataInfo | undefined {
  return KATA.find((k) => k.slug === slug);
}

export async function loadKataKnowledge(slug: string): Promise<KataKnowledge | null> {
  const kata = findKata(slug);
  if (!kata) return null;
  const raw = await readFile(join(SKILLS_DIR, kata.file), "utf8").catch(() => null);
  if (!raw) return null;
  return parseKataKnowledge(kata, raw);
}

// 先生が確かめる前の下書き（先頭の印）は使わない（skills の約束と同じ）
export function parseKataKnowledge(kata: KataInfo, raw: string): KataKnowledge | null {
  if (DRAFT_MARK.test(raw)) return null;
  const sections = splitSections(raw);
  const steps: KataStep[] = [];
  for (const line of sections.find((s) => s.title.includes("各挙動のポイント"))?.lines ?? []) {
    const cells = line.split("|").map((c) => c.trim());
    // | 挙動 | 立ち方 | 技 | 動き方 | ポイント | 手本の時刻 |
    if (cells.length < 6) continue;
    const no = Number(cells[1]);
    if (!Number.isInteger(no) || no < 1) continue;
    steps.push({ no, stance: cells[2], technique: cells[3], movement: cells[4], point: cells[5] });
  }

  const keyPoints = (sections.find((s) => s.title.includes("形の要点"))?.lines ?? [])
    .map((l) => /^\s*-\s*要点\d+[：:]\s*(.+)$/.exec(l)?.[1]?.trim())
    .filter((x): x is string => !!x);

  const stumbles: KataKnowledge["stumbles"] = [];
  for (const line of sections.find((s) => s.title.includes("つまずき"))?.lines ?? []) {
    const s = /^\s*-\s*つまずき[：:]\s*(.+)$/.exec(line);
    if (s) {
      stumbles.push({ stumble: s[1].trim(), fix: "" });
      continue;
    }
    const f = /^\s*／\s*直し方・声かけ[：:]\s*(.+)$/.exec(line);
    if (f && stumbles.length > 0) stumbles[stumbles.length - 1].fix = f[1].trim();
  }

  const guardianTip =
    (sections.find((s) => s.title.includes("家でできる練習"))?.lines ?? [])
      .map((l) => /^\s*-\s*保護者が見るポイント[：:]\s*(.+)$/.exec(l)?.[1]?.trim())
      .find(Boolean) ?? "";

  return { kata, steps, keyPoints, stumbles, guardianTip };
}

function splitSections(raw: string): { title: string; lines: string[] }[] {
  const out: { title: string; lines: string[] }[] = [];
  for (const line of raw.replace(/<!--[\s\S]*?-->/g, "").replace(/<!--[\s\S]*$/, "").split("\n")) {
    const h = /^##\s+(.*)$/.exec(line.trim());
    if (h) out.push({ title: h[1], lines: [] });
    else out.at(-1)?.lines.push(line);
  }
  return out;
}

// 見比べの材料にする先生の知見。Claude には ID 付きで渡し、使った ID を返させる（知見から選んだことを確かめるため）
export type KnowledgeItem = { id: string; label: string; text: string };

export function knowledgeItems(k: KataKnowledge, step: KataStep): KnowledgeItem[] {
  const items: KnowledgeItem[] = [];
  if (step.point) items.push({ id: "point", label: `${step.no}挙動目のポイント`, text: step.point });
  k.keyPoints.forEach((p, i) => items.push({ id: `key${i + 1}`, label: `形の要点${i + 1}`, text: p }));
  k.stumbles.forEach((s, i) =>
    items.push({ id: `stumble${i + 1}`, label: "よくあるつまずきと直し方", text: `${s.stumble}／${s.fix}` }),
  );
  if (k.guardianTip) items.push({ id: "guardian", label: "保護者が見るポイント", text: k.guardianTip });
  return items;
}

// 先生の手本の写真：public/kata/<形>/model/<挙動2けた>.jpg（例：01.jpg）
export function modelPhotoPath(slug: string, step: number): string {
  return `/kata/${slug}/model/${String(step).padStart(2, "0")}.jpg`;
}

export async function hasModelPhoto(slug: string, step: number): Promise<boolean> {
  return access(join(process.cwd(), "public", modelPhotoPath(slug, step))).then(
    () => true,
    () => false,
  );
}

// デモの「練習の写真」（作者が、よくあるつまずきをまねて撮ったもの）。平安二段の1挙動目だけ
export const PRACTICE_SAMPLE = { slug: "heian-nidan", step: 1, path: "/samples/practice-heian-nidan-01.jpg" } as const;

// 保護者の画面に渡す形と挙動の一覧（先生が書いた挙動のポイントと、手本の写真の有無）
export async function kataOptions() {
  const out = [];
  for (const kata of KATA) {
    const k = await loadKataKnowledge(kata.slug);
    if (!k || k.steps.length === 0) continue;
    const steps = await Promise.all(
      k.steps.map(async (s) => ({
        no: s.no,
        label: `${s.stance}・${s.technique}`,
        point: s.point,
        modelPhoto: (await hasModelPhoto(kata.slug, s.no)) ? modelPhotoPath(kata.slug, s.no) : null,
      })),
    );
    const sample =
      PRACTICE_SAMPLE.slug === kata.slug &&
      (await access(join(process.cwd(), "public", PRACTICE_SAMPLE.path)).then(
        () => true,
        () => false,
      ))
        ? { step: PRACTICE_SAMPLE.step, path: PRACTICE_SAMPLE.path }
        : null;
    out.push({ slug: kata.slug, name: kata.name, steps, sample });
  }
  return out;
}
