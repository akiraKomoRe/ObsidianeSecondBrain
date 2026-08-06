import { LogOut } from "lucide-react";

import { logout } from "@/lib/auth/actions";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileTabBar } from "@/components/ui/mobile-tab-bar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const initial = profile.name ? profile.name.charAt(0) : profile.email.charAt(0);

  return (
    <SidebarProvider className="bg-app-bg text-app-text">
      <AppSidebar profile={profile} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-text text-xs font-bold text-white">
              昭
            </div>
            <p className="text-sm font-semibold text-app-text">昭和建設工業</p>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <form action={logout}>
              <Button type="submit" title="ログアウト" variant="ghost" size="icon" className="rounded-full">
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </Button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24 sm:px-6 md:px-8 md:pb-6">
          {children}
        </main>

        <MobileTabBar profile={profile} />
      </div>
    </SidebarProvider>
  );
}
