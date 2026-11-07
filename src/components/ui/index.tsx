import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "student" | "parent" | "coach";
const toneBorder: Record<Tone, string> = { student: "border-t-ai", parent: "border-t-wakatake", coach: "border-t-sumi" };

// 紙のカード。上の縁に立場の色（tone）。角を丸め、紙を置いたような淡い影で親しみを出す
export function Card({ tone = "student", className = "", children, ...rest }: { tone?: Tone; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`rounded-2xl border border-line border-t-4 bg-paper p-4 shadow-[0_6px_16px_-10px_rgba(60,45,25,0.35)] ${toneBorder[tone]} ${className}`} {...rest}>
      {children}
    </section>
  );
}

// 明朝の見出しと、筆で引いたような下線
export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="font-mincho text-lg font-extrabold">
        {children}
      </h2>
      <div aria-hidden className="mt-1 h-[3px] w-16 rounded-full bg-shu/80" style={{ transform: "skewX(-20deg)" }} />
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-mincho text-xl font-extrabold leading-relaxed">{children}</h1>;
}

// 朱印（はんこ）
export function Hanko({ children, size = 40, className = "" }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <span
      className={`font-mincho inline-flex shrink-0 items-center justify-center rounded-full border-2 border-shu text-center text-[11px] leading-tight font-extrabold text-shu ${className}`}
      style={{ width: size, height: size, transform: "rotate(-8deg)" }}
    >
      {children}
    </span>
  );
}

// 押せそうに見えるよう、角を丸めて下に少し厚みを付ける（押すと沈む）
const primary =
  "block w-full rounded-xl bg-ai py-3.5 text-center text-base font-bold text-white shadow-[0_3px_0_var(--color-ai-deep)] transition active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-ai-deep)] disabled:opacity-50";
const secondary =
  "block w-full rounded-xl border-2 border-sumi/80 bg-paper py-3 text-center text-base font-bold shadow-[0_3px_0_rgba(34,37,43,0.25)] transition active:translate-y-[2px] active:shadow-none disabled:opacity-50";

export function LinkButton({ href, variant = "primary", children }: { href: string; variant?: "primary" | "secondary"; children: ReactNode }) {
  return (
    <Link href={href} className={variant === "primary" ? primary : secondary}>
      {children}
    </Link>
  );
}

export const buttonClass = { primary, secondary };
