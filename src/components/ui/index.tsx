import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "student" | "parent" | "coach";
const toneBorder: Record<Tone, string> = { student: "border-t-ai", parent: "border-t-wakatake", coach: "border-t-sumi" };

// 紙のカード。上の縁に立場の色（tone）
export function Card({ tone = "student", className = "", children, ...rest }: { tone?: Tone; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`border border-line border-t-4 bg-paper p-4 ${toneBorder[tone]} ${className}`} {...rest}>
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
      <div aria-hidden className="mt-1 h-[3px] w-16 rounded-full bg-sumi" style={{ transform: "skewX(-20deg)" }} />
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

const primary = "block w-full bg-ai py-3.5 text-center text-base font-bold text-white rounded disabled:opacity-50";
const secondary = "block w-full border-2 border-sumi bg-paper py-3 text-center text-base font-bold rounded disabled:opacity-50";

export function LinkButton({ href, variant = "primary", children }: { href: string; variant?: "primary" | "secondary"; children: ReactNode }) {
  return (
    <Link href={href} className={variant === "primary" ? primary : secondary}>
      {children}
    </Link>
  );
}

export const buttonClass = { primary, secondary };
