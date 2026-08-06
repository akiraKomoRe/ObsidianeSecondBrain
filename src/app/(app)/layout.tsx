import Link from "next/link";

import { logout } from "@/lib/auth/actions";
import { getCurrentProfile } from "@/lib/auth/current-user";

const NAV_ITEMS = [
  { href: "/daily", label: "日報" },
  { href: "/weekly", label: "週報" },
  { href: "/evaluations", label: "AI週次評価" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">昭和建設工業 人事評価システム</p>
            <p className="text-xs text-slate-500">{profile.name}さん（{profile.email}）</p>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
              ログアウト
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-4 px-4 pb-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
