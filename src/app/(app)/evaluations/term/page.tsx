import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatPeriodLabel, listPeriods } from "@/lib/evaluation/get-term";
import { JOB_GRADE_LABELS } from "@/lib/evaluation/score";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TermEvaluation } from "@/types/database";

const STAGE_LABELS: Record<TermEvaluation["stage"], string> = {
  goal_setting: "期首設定",
  midterm: "中間進捗",
  final: "最終評価",
};

const STATUS_LABELS: Record<TermEvaluation["status"], string> = {
  draft: "作成中",
  pending_approval: "承認待ち",
  approved: "承認済み",
};

export default async function TermEvaluationListPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [periods, { data: evaluations }] = await Promise.all([
    listPeriods(),
    supabase.from("term_evaluations").select("*").eq("user_id", profile.id),
  ]);

  const byPeriod = new Map((evaluations ?? []).map((e) => [e.period_id, e]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-app-text">
          <ClipboardList className="h-5 w-5 text-app-accent" />
          期末評価
        </h1>
        <p className="mt-1 text-sm text-app-text-muted">
          期首に目標を立て、中間で進捗を振り返り、期末に自己評価を記入します。役職（
          {JOB_GRADE_LABELS[profile.job_grade]}）に応じた配分で100点満点で算出されます。
        </p>
      </div>

      {periods.length === 0 ? (
        <p className="rounded-lg border border-dashed border-app-border bg-app-card px-4 py-10 text-center text-sm text-app-text-muted">
          評価期間がまだ登録されていません。管理者にお問い合わせください。
        </p>
      ) : (
        <ul className="space-y-3">
          {periods.map((period) => {
            const evaluation = byPeriod.get(period.id);
            return (
              <li key={period.id}>
                <Link href={`/evaluations/term/${period.id}`} className="block">
                  <Card className="gap-2 p-5 transition-colors hover:bg-app-card-hover">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-app-text">{formatPeriodLabel(period)}</p>
                      {evaluation ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{STAGE_LABELS[evaluation.stage]}</Badge>
                          <Badge variant={evaluation.status === "approved" ? "success" : "accent"}>
                            {STATUS_LABELS[evaluation.status]}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline">未作成</Badge>
                      )}
                    </div>
                    <p className="tabular text-xs text-app-text-faint">
                      {period.starts_on} 〜 {period.ends_on}
                    </p>
                    {evaluation?.disclosed_at ? (
                      <p className="text-sm text-app-success">上長評価が公開されています</p>
                    ) : evaluation?.status === "approved" ? (
                      <p className="text-sm text-app-text-muted">
                        承認済みです。面談後に上長評価が公開されます。
                      </p>
                    ) : null}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
