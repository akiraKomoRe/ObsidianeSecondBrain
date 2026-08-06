"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { isNavItemActive, visibleNavItems } from "@/app/(app)/nav-links";
import { logout } from "@/lib/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Profile } from "@/types/database";

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const initial = profile.name ? profile.name.charAt(0) : profile.email.charAt(0);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-text text-sm font-bold text-white">
            昭
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-app-text">昭和建設工業</p>
            <p className="truncate text-xs leading-tight text-app-text-muted">人事評価システム</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-app-card-hover px-3 py-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-app-text">{profile.name}さん</p>
            <p className="truncate text-xs text-app-text-faint">{profile.email}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {visibleNavItems(profile.role).map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={active}>
                  <Link href={item.href}>
                    <Icon strokeWidth={2} />
                    {item.label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="h-auto w-full justify-start gap-2.5 px-3 py-2.5 text-sm font-medium text-app-text-muted"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            ログアウト
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
