import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/current-user";
import { AdminTabs } from "./admin-tabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-app-text">管理</h1>
        <p className="mt-1 text-sm text-app-text-muted">
          社員の役職・上長、部署、評価期間、会社休日を設定します。
          ここでの設定が期末評価の配点・承認経路・部門目標の担当者・日報の提出義務日を決めます。
        </p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
