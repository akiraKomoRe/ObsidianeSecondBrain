import { LayoutDashboard, NotebookPen, CalendarRange, Sparkles } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: LayoutDashboard },
  { href: "/daily", label: "日報", icon: NotebookPen },
  { href: "/weekly", label: "週報", icon: CalendarRange },
  { href: "/evaluations", label: "AI週次評価", icon: Sparkles },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
