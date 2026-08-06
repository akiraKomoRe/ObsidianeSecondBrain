import { Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireManagerOrAdmin } from "@/lib/team/get-team-member";
import { formatDate, getWeekRange } from "@/lib/date/week";
import { Card, CardHeader } from "@/components/ui/section-card";
import { TeamMemberRow } from "./team-member-row";
import type { TeamMemberSummary } from "@/lib/team/types";
import type { Profile } from "@/types/database";

export default async function TeamPage() {
  const caller = await requireManagerOrAdmin();
  const supabase = await createClient();

  const { data: members } =
    caller.role === "admin"
      ? await supabase.from("profiles").select("*").neq("id", caller.id).order("name")
      : await supabase.from("profiles").select("*").eq("manager_id", caller.id).order("name");

  const memberList: Profile[] = members ?? [];
  const memberIds = memberList.map((m) => m.id);

  const today = formatDate(new Date());
  const { weekStart } = getWeekRange(new Date());

  const [{ data: todayReports }, { data: weeklyReports }, { data: evaluations }] =
    memberIds.length === 0
      ? [{ data: [] }, { data: [] }, { data: [] }]
      : await Promise.all([
          supabase.from("daily_reports").select("user_id").in("user_id", memberIds).eq("report_date", today),
          supabase
            .from("weekly_reports")
            .select("user_id, submitted_at")
            .in("user_id", memberIds)
            .eq("week_start", weekStart),
          supabase
            .from("weekly_ai_evaluations")
            .select("user_id, week_start, criteria_scores")
            .in("user_id", memberIds)
            .order("week_start", { ascending: false }),
        ]);

  const todaySubmittedIds = new Set((todayReports ?? []).map((r) => r.user_id));
  const weekSubmittedIds = new Set(
    (weeklyReports ?? []).filter((r) => r.submitted_at).map((r) => r.user_id)
  );
  const latestEvaluationByUser = new Map<string, { weekStart: string; avgScore: number | null }>();
  for (const evaluation of evaluations ?? []) {
    if (latestEvaluationByUser.has(evaluation.user_id)) continue;
    const scores = evaluation.criteria_scores;
    const avgScore = scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : null;
    latestEvaluationByUser.set(evaluation.user_id, { weekStart: evaluation.week_start, avgScore });
  }

  const summaries: TeamMemberSummary[] = memberList.map((profile) => ({
    profile,
    todayReportSubmitted: todaySubmittedIds.has(profile.id),
    weekReportSubmitted: weekSubmittedIds.has(profile.id),
    latestEvaluation: latestEvaluationByUser.get(profile.id) ?? null,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-app-text">
          <Users className="h-5 w-5 text-app-accent" />
          チーム
        </h1>
        <p className="mt-1 text-sm text-app-text-muted">
          部下の日報・週報の提出状況とAI週次評価を確認できます（閲覧のみ）。
        </p>
      </div>

      {summaries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-app-border bg-app-card px-4 py-8 text-center text-sm text-app-text-muted">
          表示できるメンバーがいません。
        </p>
      ) : (
        <Card>
          <CardHeader title="チームメンバー" count={summaries.length} />
          <ul className="divide-y divide-app-border">
            {summaries.map((summary) => (
              <TeamMemberRow key={summary.profile.id} summary={summary} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
