import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/get-team-member";
import { addWeeks, formatWeekLabel, getWeekRange } from "@/lib/date/week";
import { ReportTimeline } from "@/components/reports/report-timeline";
import { Card } from "@/components/ui/card";

export default async function TeamMemberWeeklyPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { memberId } = await params;
  const { member } = await getTeamMember(memberId);

  const { week } = await searchParams;
  const { weekStart, weekEnd } = week
    ? { weekStart: week, weekEnd: getWeekRange(new Date(`${week}T00:00:00`)).weekEnd }
    : getWeekRange(new Date());

  const supabase = await createClient();

  const [{ data: dailyReports }, { data: weeklyReport }] = await Promise.all([
    supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", member.id)
      .gte("report_date", weekStart)
      .lte("report_date", weekEnd)
      .order("report_date", { ascending: false }),
    supabase
      .from("weekly_reports")
      .select("*")
      .eq("user_id", member.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
  ]);

  const prevWeek = addWeeks(weekStart, -1);
  const nextWeek = addWeeks(weekStart, 1);
  const isCurrentWeek = weekStart === getWeekRange(new Date()).weekStart;
  const basePath = `/team/${member.id}/weekly`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 rounded-full border border-app-border bg-app-card p-1.5">
        <Link
          href={`${basePath}?week=${prevWeek}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
          aria-label="前週"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-app-text">{formatWeekLabel(weekStart, weekEnd)}</span>
          {isCurrentWeek ? (
            <span className="rounded-full bg-app-accent px-2 py-0.5 text-[11px] font-medium text-white">今週</span>
          ) : null}
        </div>
        {!isCurrentWeek ? (
          <Link
            href={`${basePath}?week=${nextWeek}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
            aria-label="翌週"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="h-9 w-9" />
        )}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-app-text">週報の提出状況</h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              weeklyReport?.submitted_at
                ? "bg-app-success-soft text-app-success"
                : "bg-app-accent-soft text-app-accent"
            }`}
          >
            {weeklyReport?.submitted_at ? "提出済み" : "未提出"}
          </span>
        </div>
        {weeklyReport?.self_reflection ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-app-text-muted">{weeklyReport.self_reflection}</p>
        ) : (
          <p className="mt-3 text-sm text-app-text-faint">振り返りコメントはまだありません。</p>
        )}
      </Card>

      <ReportTimeline reports={dailyReports ?? []} />
    </div>
  );
}
