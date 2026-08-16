import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { manageableDepartments } from "@/lib/evaluation/department-goals";
import { formatPeriodLabel } from "@/lib/evaluation/get-term";
import { Card } from "@/components/ui/card";
import { DepartmentGoalEditor } from "./department-goal-editor";

/**
 * 部長が期ごとの部門目標を定める画面。
 *
 * ここで立てた目標が、部下の「部門定量項目」の紐付け先になる。制度上いちばん
 * 効く場所で、これが空のままだと部門定量項目は従来どおり本人の自由記述に
 * 戻ってしまう（壊れはしないが、部門と無関係な「部門」目標のままになる）。
 */
export default async function DepartmentGoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: departments }, { data: periods }] = await Promise.all([
    supabase.from("departments").select("*").order("sort_order"),
    supabase
      .from("evaluation_periods")
      .select("*")
      .order("year", { ascending: false })
      .order("half", { ascending: false }),
  ]);

  const all = departments ?? [];
  // 管理者は全部署、部長は自分が長を務める部署とその配下。
  const mine = profile.role === "admin" ? all : manageableDepartments(all, profile.id);

  if (mine.length === 0) {
    // 部長でも管理者でもない人がURLを直接叩いた場合。ナビには出していないが、
    // 出していないことは権限ではない。
    redirect("/team");
  }

  const openPeriods = (periods ?? []).filter((p) => p.status === "open");
  const { period: requested } = await searchParams;
  const period =
    (periods ?? []).find((p) => p.id === requested) ?? openPeriods[0] ?? (periods ?? [])[0] ?? null;

  if (!period) {
    return (
      <Card className="p-5">
        <p className="text-sm text-app-text-muted">
          評価期間が登録されていません。管理者に評価期間の登録を依頼してください。
        </p>
      </Card>
    );
  }

  const { data: goals } = await supabase
    .from("department_goals")
    .select("*")
    .eq("period_id", period.id)
    .order("sort_order");

  // 紐づいている個人目標の件数。削除してよいかの判断材料になるので先に数える。
  const { data: linkedItems } = await supabase
    .from("term_evaluation_items")
    .select("department_goal_id");
  const linkCount = new Map<string, number>();
  for (const item of linkedItems ?? []) {
    if (!item.department_goal_id) continue;
    linkCount.set(item.department_goal_id, (linkCount.get(item.department_goal_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-app-border pb-4">
        <h1 className="text-xl font-bold text-app-text">部門目標</h1>
        <p className="mt-1 text-sm text-app-text-muted">
          部下が期首に立てる「部門定量項目」の紐付け先になります。
          何をもって達成とするかまで書いておくと、個人目標が測れる形になります。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(periods ?? []).map((p) => (
          <a
            key={p.id}
            href={`/team/department-goals?period=${p.id}`}
            className={
              "rounded-md border px-3 py-1.5 text-sm transition-colors " +
              (p.id === period.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-app-border text-app-text-muted hover:bg-app-card-hover")
            }
          >
            {formatPeriodLabel(p)}
            {p.status === "closed" ? "（締切済み）" : ""}
          </a>
        ))}
      </div>

      {mine.map((department) => (
        <DepartmentGoalEditor
          key={department.id}
          department={department}
          parentName={all.find((d) => d.id === department.parent_id)?.name ?? null}
          periodId={period.id}
          periodClosed={period.status === "closed"}
          goals={(goals ?? []).filter((g) => g.department_id === department.id)}
          linkCount={Object.fromEntries(linkCount)}
        />
      ))}
    </div>
  );
}
