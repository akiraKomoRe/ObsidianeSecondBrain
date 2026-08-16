import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/get-team-member";
import { getWeekRange } from "@/lib/date/week";
import { clampToToday } from "@/lib/date/business-days";
import { countWorkingDays } from "@/lib/attendance/working-days";
import { EvaluationStatCard, ProgressStatCard, StatusStatCard } from "@/app/(app)/dashboard-cards";

export default async function TeamMemberOverviewPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const { member } = await getTeamMember(memberId);
  const supabase = await createClient();

  const today = new Date();
  const { weekStart, weekEnd } = getWeekRange(today);
  // 休日・有給を除いた「今日までに提出されているべき件数」。祝日や有給の日は
  // 分母に入らないので、休んだ部下が未提出扱いにならない。
  const weekdayTarget = await countWorkingDays(member.id, weekStart, clampToToday(weekEnd, today));

  const [{ data: weekDailyReports }, { data: weeklyReport }, { data: recentEvaluations }] = await Promise.all([
    supabase
      .from("daily_reports")
      .select("id")
      .eq("user_id", member.id)
      .gte("report_date", weekStart)
      .lte("report_date", weekEnd),
    supabase
      .from("weekly_reports")
      .select("submitted_at")
      .eq("user_id", member.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
    supabase
      .from("weekly_ai_evaluations")
      .select("week_start, criteria_scores")
      .eq("user_id", member.id)
      .order("week_start", { ascending: false })
      .limit(2),
  ]);

  const avgOf = (scores: { score: number }[]) =>
    scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : null;

  const latestAvg = recentEvaluations?.[0] ? avgOf(recentEvaluations[0].criteria_scores) : null;
  const previousAvg = recentEvaluations?.[1] ? avgOf(recentEvaluations[1].criteria_scores) : null;
  const trend: "up" | "down" | "flat" | null =
    latestAvg === null || previousAvg === null
      ? null
      : latestAvg > previousAvg
        ? "up"
        : latestAvg < previousAvg
          ? "down"
          : "flat";

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ProgressStatCard
        label="今週の日報"
        value={weekDailyReports?.length ?? 0}
        target={Math.max(weekdayTarget, 1)}
        href={`/team/${member.id}/daily`}
      />
      <StatusStatCard
        label="今週の週報"
        submitted={Boolean(weeklyReport?.submitted_at)}
        href={`/team/${member.id}/weekly`}
      />
      <EvaluationStatCard avgScore={latestAvg} trend={trend} href={`/team/${member.id}/evaluations`} />
    </div>
  );
}
