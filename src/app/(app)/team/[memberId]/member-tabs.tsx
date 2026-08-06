"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { suffix: "", label: "概要" },
  { suffix: "/daily", label: "日報" },
  { suffix: "/weekly", label: "週報" },
  { suffix: "/evaluations", label: "AI週次評価" },
];

export function MemberTabs({ memberId }: { memberId: string }) {
  const pathname = usePathname();
  const base = `/team/${memberId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-app-border">
      {TABS.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const active = tab.suffix === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.suffix}
            href={href}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-app-accent text-app-accent"
                : "border-transparent text-app-text-muted hover:text-app-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
