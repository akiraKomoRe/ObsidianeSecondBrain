import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/get-team-member";
import { formatPeriodLabel, listPeriods } from "@/lib/evaluation/get-term";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TermEvaluation } from "@/types/database";

const STATUS_LABELS: Record<TermEvaluation["status"], string> = {
  draft: "作成中",
  pending_approval: "承認待ち",
  approved: "承認済み",
};

const STAGE_LABELS: Record<TermEvaluation["stage"], string> = {
  goal_setting: "期首設定",
  midterm: "中間進捗",
  final: "最終評価",
};

export default async function TeamMemberTermListPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const { member } = await getTeamMember(memberId);
  const supabase = await createClient();

  const [periods, { data: evaluations }] = await Promise.all([
    listPeriods(),
    supabase.from("term_evaluations").select("*").eq("user_id", member.id),
  ]);

  const byPeriod = new Map((evaluations ?? []).map((e) => [e.period_id, e]));

  return (
    <div className="space-y-3">
      {periods.length === 0 ? (
        <p className="rounded-lg border border-dashed border-app-border bg-app-card px-4 py-10 text-center text-sm text-app-text-muted">
          評価期間がまだ登録されていません。
        </p>
      ) : (
        periods.map((period) => {
          const evaluation = byPeriod.get(period.id);
          return (
            <div key={period.id}>
              {evaluation ? (
                <Link href={`/team/${member.id}/term/${period.id}`} className="block">
                  <Card className="gap-2 p-5 transition-colors hover:bg-app-card-hover">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-app-text">{formatPeriodLabel(period)}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{STAGE_LABELS[evaluation.stage]}</Badge>
                        <Badge variant={evaluation.status === "approved" ? "success" : "accent"}>
                          {STATUS_LABELS[evaluation.status]}
                        </Badge>
                        {evaluation.disclosed_at ? <Badge variant="success">公開済み</Badge> : null}
                      </div>
                    </div>
                    <p className="tabular text-xs text-app-text-faint">
                      {period.starts_on} 〜 {period.ends_on}
                    </p>
                  </Card>
                </Link>
              ) : (
                <Card className="gap-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-app-text">{formatPeriodLabel(period)}</p>
                    <Badge variant="outline">未作成</Badge>
                  </div>
                  <p className="text-sm text-app-text-muted">
                    本人が評価シートを作成すると、ここに表示されます。
                  </p>
                </Card>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
