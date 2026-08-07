import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreBar } from "@/app/(app)/evaluations/score-bar";
import { formatWeekLabel } from "@/lib/date/week";
import type { DailyReport } from "@/types/database";

export function ProgressStatCard({
  label,
  value,
  target,
  href,
}: {
  label: string;
  value: number;
  target: number;
  href: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const onTrack = value >= target;

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full gap-2 p-5 transition-colors hover:bg-app-card-hover">
        <p className="text-sm font-medium text-app-text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-app-text">
          {value}
          <span className="text-base font-medium text-app-text-faint"> / {target}件</span>
        </p>
        <Progress value={pct} className="mt-1" indicatorClassName={onTrack ? "bg-app-success" : "bg-primary"} />
      </Card>
    </Link>
  );
}

export function StatusStatCard({
  label,
  submitted,
  href,
}: {
  label: string;
  submitted: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full gap-2 p-5 transition-colors hover:bg-app-card-hover">
        <p className="text-sm font-medium text-app-text-muted">{label}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant={submitted ? "success" : "accent"}>{submitted ? "提出済み" : "未提出"}</Badge>
        </div>
        <p className="mt-2 flex items-center gap-1 text-sm text-app-text-faint">
          詳細を見る <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </Card>
    </Link>
  );
}

export function EvaluationStatCard({
  avgScore,
  trend,
  href,
}: {
  avgScore: number | null;
  trend: "up" | "down" | "flat" | null;
  href: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-app-success" : trend === "down" ? "text-app-danger" : "text-app-text-faint";

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full gap-2 p-5 transition-colors hover:bg-app-card-hover">
        <p className="flex items-center gap-1.5 text-sm font-medium text-app-text-muted">
          <Sparkles className="h-3.5 w-3.5 text-app-accent" />
          直近のAI週次評価
        </p>
        {avgScore === null ? (
          <p className="mt-1 text-sm text-app-text-faint">まだ評価がありません</p>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-bold text-app-text">
              {avgScore.toFixed(1)}
              <span className="text-base font-medium text-app-text-faint"> / 5</span>
            </p>
            {trend ? <TrendIcon className={`h-5 w-5 ${trendColor}`} strokeWidth={2.5} /> : null}
          </div>
        )}
        <p className="mt-2 flex items-center gap-1 text-sm text-app-text-faint">
          評価一覧を見る <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </Card>
    </Link>
  );
}

// Section shell shared by the two dashboard panels below: a titled header with
// a "see all" link, over a list body.
function PanelCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between gap-3 border-b border-app-border px-5 py-3.5">
        <h2 className="text-md font-semibold text-app-text">{title}</h2>
        <Link href={href} className="text-sm font-medium text-app-accent hover:underline">
          すべて見る
        </Link>
      </div>
      {children}
    </Card>
  );
}

export function RecentReports({ reports }: { reports: DailyReport[] }) {
  return (
    <PanelCard title="直近の日報" href="/daily">
      {reports.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-app-text-muted">まだ日報がありません。</p>
      ) : (
        <ul className="divide-y divide-app-border-soft">
          {reports.map((report) => (
            <li key={report.id} className="flex items-baseline gap-3 px-5 py-3">
              <time className="w-24 shrink-0 text-xs font-medium text-app-text-muted">{report.report_date}</time>
              <p className="min-w-0 flex-1 truncate text-sm text-app-text">
                {report.work_content || "(内容なし)"}
              </p>
              {report.work_hours !== null ? (
                <span className="tabular shrink-0 text-xs font-medium text-app-accent">{report.work_hours}h</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

export function ScoreTrend({
  items,
}: {
  items: { weekStart: string; weekEnd: string; avgScore: number | null }[];
}) {
  return (
    <PanelCard title="AI評価の推移" href="/evaluations">
      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-app-text-muted">まだ評価がありません。</p>
      ) : (
        <ul className="space-y-3.5 px-5 py-4">
          {items.map((item) => (
            <li key={item.weekStart} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-app-text-muted">
                  {formatWeekLabel(item.weekStart, item.weekEnd)}
                </span>
                <span className="tabular text-sm font-semibold text-app-text">
                  {item.avgScore !== null ? item.avgScore.toFixed(1) : "-"}
                </span>
              </div>
              {item.avgScore !== null ? <ScoreBar score={item.avgScore} /> : null}
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}
