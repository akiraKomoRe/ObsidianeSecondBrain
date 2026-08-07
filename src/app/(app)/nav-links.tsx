import {
  LayoutDashboard,
  NotebookPen,
  CalendarRange,
  Sparkles,
  Users,
  ClipboardList,
  CheckSquare,
} from "lucide-react";

import type { UserRole } from "@/types/database";

export const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: LayoutDashboard },
  { href: "/daily", label: "日報", icon: NotebookPen },
  { href: "/weekly", label: "週報", icon: CalendarRange },
  { href: "/evaluations/term", label: "期末評価", icon: ClipboardList },
  { href: "/evaluations", label: "AI週次評価", icon: Sparkles },
  { href: "/team", label: "チーム", icon: Users, roles: ["manager", "admin"] as UserRole[] },
  {
    href: "/approvals",
    label: "承認待ち",
    icon: CheckSquare,
    roles: ["manager", "admin"] as UserRole[],
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  // "/evaluations" would otherwise also light up on "/evaluations/term", which
  // is a separate nav entry. Match the longest applicable prefix instead.
  if (href === "/evaluations") {
    return pathname.startsWith("/evaluations") && !pathname.startsWith("/evaluations/term");
  }
  return pathname.startsWith(href);
}

export function visibleNavItems(role: UserRole) {
  return NAV_ITEMS.filter((item) => !("roles" in item) || (item.roles as UserRole[]).includes(role));
}
