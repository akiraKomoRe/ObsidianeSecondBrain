import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { addWeeks, formatWeekLabel, getWeekRange } from "@/lib/date/week";
import { WeeklyReportForm } from "./weekly-report-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="前週" asChild>
          <Link href={`/weekly?week=${prevWeek}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-app-text">{formatWeekLabel(weekStart, weekEnd)}</span>
          {isCurrentWeek ? <Badge>今週</Badge> : null}
        </div>
        {!isCurrentWeek ? (
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="翌週" asChild>
            <Link href={`/weekly?week=${nextWeek}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div className="h-10 w-10" />
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
