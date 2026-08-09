import { CheckSquare } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireManagerOrAdmin } from "@/lib/team/get-team-member";
import { relationTo } from "@/lib/evaluation/authz";
import { formatPeriodLabel, getTermEvaluation, scoreView } from "@/lib/evaluation/get-term";
import { JOB_GRADE_LABELS, formatPoints } from "@/lib/evaluation/score";
import { Card } from "@/components/ui/card";
import { ApprovalActions } from "./approval-actions";

export default async function ApprovalsPage() {
  await requireManagerOrAdmin();
  const supabase = await createClient();

  // RLS lets a manager see their own reports' submissions too -- they are the
  // ones who submitted them. This screen is specifically the second approver's
  // queue, so narrow it to evaluations this person actually signs off.
  const { data: pending } = await supabase
    .from("term_evaluations")
    .select("*")
    .eq("status", "pending_approval")
    .order("submitted_for_approval_at");

  const candidates = await Promise.all(
    (pending ?? []).map(async (evaluation) => ({
      evaluation,
      relation: await relationTo(evaluation.user_id),
    }))
  );

  const rows = await Promise.all(
    candidates
      .filter(({ relation }) => relation === "second_approver" || relation === "admin")
      .map(async ({ evaluation }) => {
        const [view, { data: subject }] = await Promise.all([
          getTermEvaluation(evaluation.id),
          supabase.from("profiles").select("*").eq("id", evaluation.user_id).maybeSingle(),
        ]);
        return { view, subject };
      })
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-app-text">
          <CheckSquare className="h-5 w-5 text-app-accent" />
          承認待ち
        </h1>
        <p className="mt-1 text-sm text-app-text-muted">
          上長が評価を確定し、あなたの承認を待っている期末評価の一覧です。
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-app-border bg-app-card px-4 py-10 text-center text-sm text-app-text-muted">
          承認待ちの評価はありません。
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ view, subject }) => {
            const managerScore = scoreView(view, "manager");
            return (
              <li key={view.evaluation.id}>
                <Card className="gap-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-app-text">{subject?.name ?? "（不明）"}</p>
                      <p className="text-sm text-app-text-muted">
                        {formatPeriodLabel(view.period)} ・ 役職{" "}
                        {JOB_GRADE_LABELS[view.evaluation.job_grade]}
                      </p>
                    </div>
                    <p className="tabular text-2xl font-bold text-app-text">
                      {formatPoints(managerScore.total)}
                      <span className="text-base font-medium text-app-text-faint"> / 100</span>
                    </p>
                  </div>

                  {view.evaluation.overall_manager_comment ? (
                    <div className="rounded-lg bg-app-card-hover px-3.5 py-3">
                      <p className="text-xs font-medium text-app-text-muted">上長コメント</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">
                        {view.evaluation.overall_manager_comment}
                      </p>
                    </div>
                  ) : null}

                  <ApprovalActions
                    evaluationId={view.evaluation.id}
                    memberId={view.evaluation.user_id}
                    periodId={view.evaluation.period_id}
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
