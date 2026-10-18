"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, visibleNavItems } from "@/app/(app)/nav-links";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

export function MobileTabBar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex gap-1 border-t border-app-border bg-app-surface px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:hidden">
      {visibleNavItems(profile.role).map((item) => {
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-colors",
              active ? "bg-app-accent-soft text-app-accent" : "text-app-text-faint"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
