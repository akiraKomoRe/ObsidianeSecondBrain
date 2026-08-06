import { LogOut } from "lucide-react";

import { logout } from "@/lib/auth/actions";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileTabBar } from "@/components/ui/mobile-tab-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const initial = profile.name ? profile.name.charAt(0) : profile.email.charAt(0);

  return (
    <div className="flex min-h-screen bg-app-bg text-app-text">
      <Sidebar profile={profile} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-text text-xs font-bold text-white">
              昭
            </div>
            <p className="text-sm font-semibold text-app-text">昭和建設工業</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-accent-soft text-sm font-semibold text-app-accent">
              {initial}
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="ログアウト"
                className="flex h-8 w-8 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24 sm:px-6 md:px-8 md:pb-6">
          {children}
        </main>

        <MobileTabBar />
      </div>
    </div>
  );
}
