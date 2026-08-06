import { LogOut } from "lucide-react";

import { logout } from "@/lib/auth/actions";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const initial = profile.name ? profile.name.charAt(0) : profile.email.charAt(0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              昭
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-900">昭和建設工業</p>
              <p className="text-xs leading-tight text-slate-500">人事評価システム</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                {initial}
              </div>
              <p className="text-sm text-slate-600">{profile.name}さん</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="ログアウト"
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </form>
          </div>
        </div>
        <NavLinks />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
