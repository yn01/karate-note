"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const roles = [
  { href: "/student", label: "道場生" },
  { href: "/parent", label: "保護者" },
  { href: "/coach", label: "指導者" },
] as const;

// 画面上部の「道場生／保護者／指導者」の切り替え（ログインなしのデモモード）
export function RoleSwitcher() {
  return <RoleLinks pathname={usePathname()} />;
}

// pathname が決まるまでの表示（動的なルートで usePathname が待つときに使う）
export function RoleSwitcherFallback() {
  return <RoleLinks pathname={null} />;
}

function RoleLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="立場の切り替え" className="mx-auto grid max-w-md grid-cols-3 gap-1 p-2">
      {roles.map((r) => {
        const active = pathname !== null && (pathname === r.href || pathname.startsWith(`${r.href}/`));
        return (
          <Link
            key={r.href}
            href={r.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg py-2 text-center text-sm font-bold transition-colors ${
              active ? "bg-white text-ink" : "text-white/80 hover:bg-white/10"
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </nav>
  );
}
