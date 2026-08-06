"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, visibleNavItems } from "@/app/(app)/nav-links";
import type { Profile } from "@/types/database";

export function MobileTabBar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-app-border bg-app-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {visibleNavItems(profile.role).map((item) => {
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              active ? "text-app-accent" : "text-app-text-faint"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
