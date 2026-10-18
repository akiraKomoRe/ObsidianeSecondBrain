import { isLocalMode } from "@/lib/local/mode";
import { DemoAccounts } from "./demo-accounts";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="flex min-h-screen bg-app-bg">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-slate-500/20 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-900">
            昭
          </div>
          <p className="text-sm font-semibold">昭和建設工業</p>
        </div>

        <div className="relative">
          <p className="text-3xl font-bold leading-snug">
            日報・週報からはじまる、
            <br />
            AIと創る人事評価。
          </p>
          <p className="mt-4 max-w-sm text-sm text-slate-300">
            毎週の記録をAIが読み解き、期末の評価づくりを支えます。最終的な評価は、これまでどおり上長が確認します。
          </p>
        </div>

        <p className="relative text-xs text-slate-400">© 昭和建設工業株式会社</p>
      </div>

      <div className="flex w-full flex-col items-center justify-start px-6 pb-12 pt-20 lg:w-1/2 lg:justify-center lg:py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-text text-sm font-bold text-white">
              昭
            </div>
            <p className="text-sm font-semibold text-app-text">昭和建設工業</p>
          </div>

          <h1 className="text-xl font-bold text-app-text">ログイン</h1>
          <p className="mt-1 text-sm text-app-text-muted">アカウントの情報を入力してください。</p>
          <LoginForm redirectTo={redirectTo ?? "/"} />
          {isLocalMode() ? <DemoAccounts /> : null}
        </div>
      </div>
    </div>
  );
}
