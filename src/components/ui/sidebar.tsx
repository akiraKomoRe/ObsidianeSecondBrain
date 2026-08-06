"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { isNavItemActive, visibleNavItems } from "@/app/(app)/nav-links";
import { logout } from "@/lib/auth/actions";
import type { Profile } from "@/types/database";

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const initial = profile.name ? profile.name.charAt(0) : profile.email.charAt(0);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-app-border bg-app-surface md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-text text-sm font-bold text-white">
          昭
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-app-text">昭和建設工業</p>
          <p className="truncate text-xs leading-tight text-app-text-muted">人事評価システム</p>
        </div>
      </div>

      <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-xl bg-app-card-hover px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-sm font-semibold text-app-accent">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-app-text">{profile.name}さん</p>
          <p className="truncate text-xs text-app-text-faint">{profile.email}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {visibleNavItems(profile.role).map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-app-accent-soft text-app-accent"
                  : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="border-t border-app-border p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          ログアウト
        </button>
      </form>
    </aside>
  );
}
