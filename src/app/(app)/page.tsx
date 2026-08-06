import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, getWeekRange } from "@/lib/date/week";
import { clampToToday, countWeekdays } from "@/lib/date/business-days";
import { EvaluationStatCard, ProgressStatCard, QuickLinks, StatusStatCard } from "./dashboard-cards";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const today = new Date();
  const todayStr = formatDate(today);
  const { weekStart, weekEnd } = getWeekRange(today);
  const weekdayTarget = countWeekdays(weekStart, clampToToday(weekEnd, today));

  const [{ data: weekDailyReports }, { data: todayReport }, { data: weeklyReport }, { data: recentEvaluations }] =
    await Promise.all([
      supabase
        .from("daily_reports")
        .select("id")
        .eq("user_id", user!.id)
        .gte("report_date", weekStart)
        .lte("report_date", weekEnd),
      supabase
        .from("daily_reports")
        .select("id")
        .eq("user_id", user!.id)
        .eq("report_date", todayStr)
        .maybeSingle(),
      supabase
        .from("weekly_reports")
        .select("submitted_at")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle(),
      supabase
        .from("weekly_ai_evaluations")
        .select("week_start, criteria_scores")
        .eq("user_id", user!.id)
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

  const dateLabel = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${
    WEEKDAY_LABELS[today.getDay()]
  }）`;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-slate-500/20 blur-3xl" />

        <div className="relative">
          <p className="text-sm text-slate-300">{dateLabel}</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">{profile?.name ?? ""}さん、お疲れ様です</h1>

          <div className="mt-5">
            {todayReport ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                本日の日報は提出済みです。
              </div>
            ) : (
              <Link
                href="/daily"
                className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/15 sm:inline-flex"
              >
                <span>本日の日報がまだ入力されていません。</span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-app-accent px-3 py-1.5 font-semibold text-slate-900">
                  入力する <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ProgressStatCard
          label="今週の日報"
          value={weekDailyReports?.length ?? 0}
          target={Math.max(weekdayTarget, 1)}
          href="/daily"
        />
        <StatusStatCard label="今週の週報" submitted={Boolean(weeklyReport?.submitted_at)} href="/weekly" />
        <EvaluationStatCard avgScore={latestAvg} trend={trend} href="/evaluations" />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">メニュー</h2>
        <QuickLinks />
      </div>
    </div>
  );
}
