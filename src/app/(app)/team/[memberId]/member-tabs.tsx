"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

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
    <nav className="flex w-full gap-1 overflow-x-auto rounded-full border border-app-border bg-app-card p-1.5">
      {TABS.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const active = tab.suffix === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.suffix}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
