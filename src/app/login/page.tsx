import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">昭和建設工業 人事評価システム</h1>
        <p className="mt-1 text-sm text-slate-500">アカウントにログインしてください。</p>
        <LoginForm redirectTo={redirectTo ?? "/daily"} />
      </div>
    </div>
  );
}
