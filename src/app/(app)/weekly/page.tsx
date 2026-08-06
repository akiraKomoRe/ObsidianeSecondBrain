import Link from "next/link";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">週報入力</h2>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/weekly?week=${prevWeek}`} className="text-slate-500 hover:text-slate-900 hover:underline">
            ← 前週
          </Link>
          <span className="font-medium text-slate-700">{formatWeekLabel(weekStart, weekEnd)}</span>
          {!isCurrentWeek ? (
            <Link href={`/weekly?week=${nextWeek}`} className="text-slate-500 hover:text-slate-900 hover:underline">
              翌週 →
            </Link>
          ) : (
            <span className="text-slate-300">翌週 →</span>
          )}
        </div>
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
