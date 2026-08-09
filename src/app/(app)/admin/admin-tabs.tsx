"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/members", label: "社員マスタ" },
  { href: "/admin/periods", label: "評価期間" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full gap-1 overflow-x-auto rounded-full border border-app-border bg-app-card p-1.5">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(tab.href)
              ? "bg-primary text-primary-foreground"
              : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
