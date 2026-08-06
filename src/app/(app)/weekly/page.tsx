import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { addWeeks, formatWeekLabel, getWeekRange } from "@/lib/date/week";
import { WeeklyReportForm } from "./weekly-report-form";

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const { weekStart, weekEnd } = week
    ? { weekStart: week, weekEnd: getWeekRange(new Date(`${week}T00:00:00`)).weekEnd }
    : getWeekRange(new Date());

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: dailyReports }, { data: weeklyReport }] = await Promise.all([
    supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", user!.id)
      .gte("report_date", weekStart)
      .lte("report_date", weekEnd)
      .order("report_date", { ascending: true }),
    supabase
      .from("weekly_reports")
      .select("*")
      .eq("user_id", user!.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
  ]);

  const prevWeek = addWeeks(weekStart, -1);
  const nextWeek = addWeeks(weekStart, 1);
  const isCurrentWeek = weekStart === getWeekRange(new Date()).weekStart;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-app-text">週報入力</h1>

      <div className="flex items-center justify-between gap-2 rounded-full border border-app-border bg-app-card p-1.5">
        <Link
          href={`/weekly?week=${prevWeek}`}
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
            href={`/weekly?week=${nextWeek}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text"
            aria-label="翌週"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="h-9 w-9" />
        )}
      </div>

      <WeeklyReportForm
        weekStart={weekStart}
        weekEnd={weekEnd}
        weekLabel={formatWeekLabel(weekStart, weekEnd)}
        dailyReports={dailyReports ?? []}
        existingReport={weeklyReport ?? null}
      />
    </div>
  );
}
