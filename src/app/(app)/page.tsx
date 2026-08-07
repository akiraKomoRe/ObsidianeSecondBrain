import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, getWeekRange } from "@/lib/date/week";
import { clampToToday, countWeekdays } from "@/lib/date/business-days";
import { Button } from "@/components/ui/button";
import {
  EvaluationStatCard,
  ProgressStatCard,
  RecentReports,
  ScoreTrend,
  StatusStatCard,
} from "./dashboard-cards";

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

  const [
    { data: weekDailyReports },
    { data: todayReport },
    { data: weeklyReport },
    { data: recentEvaluations },
    { data: latestReports },
  ] = await Promise.all([
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
      .select("week_start, week_end, criteria_scores")
      .eq("user_id", user!.id)
      .order("week_start", { ascending: false })
      .limit(5),
    supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", user!.id)
      .order("report_date", { ascending: false })
      .limit(6),
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

  const trendItems = (recentEvaluations ?? []).map((evaluation) => ({
    weekStart: evaluation.week_start,
    weekEnd: evaluation.week_end,
    avgScore: avgOf(evaluation.criteria_scores),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <time className="text-sm text-app-text-muted">{dateLabel}</time>
          <h1 className="mt-0.5 text-xl font-bold text-app-text">
            {profile?.name ?? ""}さん、お疲れ様です
          </h1>
        </div>

        {todayReport ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-app-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            本日の日報は提出済みです
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-app-text-muted">本日の日報が未入力です</p>
            <Button asChild size="sm">
              <Link href="/daily">
                入力する <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
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

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <RecentReports reports={latestReports ?? []} />
        <ScoreTrend items={trendItems} />
      </div>
    </div>
  );
}
