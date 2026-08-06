import { LayoutDashboard, NotebookPen, CalendarRange, Sparkles, Users } from "lucide-react";

import type { UserRole } from "@/types/database";

export const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: LayoutDashboard },
  { href: "/daily", label: "日報", icon: NotebookPen },
  { href: "/weekly", label: "週報", icon: CalendarRange },
  { href: "/evaluations", label: "AI週次評価", icon: Sparkles },
  { href: "/team", label: "チーム", icon: Users, roles: ["manager", "admin"] as UserRole[] },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function visibleNavItems(role: UserRole) {
  return NAV_ITEMS.filter((item) => !("roles" in item) || (item.roles as UserRole[]).includes(role));
}
