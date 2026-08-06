import Link from "next/link";
import { ArrowRight, CalendarRange, NotebookPen, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";

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
    <Link
      href={href}
      className="flex flex-col justify-between rounded-2xl border border-app-border bg-app-card p-5 transition-colors hover:bg-app-card-hover"
    >
      <p className="text-sm font-medium text-app-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-app-text">
        {value}
        <span className="text-base font-medium text-app-text-faint"> / {target}件</span>
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-app-border-soft">
        <div
          className={`h-full rounded-full ${onTrack ? "bg-app-success" : "bg-app-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
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
    <Link
      href={href}
      className="flex flex-col justify-between rounded-2xl border border-app-border bg-app-card p-5 transition-colors hover:bg-app-card-hover"
    >
      <p className="text-sm font-medium text-app-text-muted">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold ${
            submitted ? "bg-app-success-soft text-app-success" : "bg-app-accent-soft text-app-accent"
          }`}
        >
          {submitted ? "提出済み" : "未提出"}
        </span>
      </div>
      <p className="mt-3 flex items-center gap-1 text-sm text-app-text-faint">
        詳細を見る <ArrowRight className="h-3.5 w-3.5" />
      </p>
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
    <Link
      href={href}
      className="flex flex-col justify-between rounded-2xl border border-app-border bg-app-card p-5 transition-colors hover:bg-app-card-hover"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-app-text-muted">
        <Sparkles className="h-3.5 w-3.5 text-app-accent" />
        直近のAI週次評価
      </p>
      {avgScore === null ? (
        <p className="mt-2 text-sm text-app-text-faint">まだ評価がありません</p>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-2xl font-bold text-app-text">
            {avgScore.toFixed(1)}
            <span className="text-base font-medium text-app-text-faint"> / 5</span>
          </p>
          {trend ? <TrendIcon className={`h-5 w-5 ${trendColor}`} strokeWidth={2.5} /> : null}
        </div>
      )}
      <p className="mt-3 flex items-center gap-1 text-sm text-app-text-faint">
        評価一覧を見る <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}

const QUICK_LINKS = [
  {
    href: "/daily",
    icon: NotebookPen,
    label: "日報",
    description: "今日の作業内容を記録する",
  },
  {
    href: "/weekly",
    icon: CalendarRange,
    label: "週報",
    description: "週の振り返りを提出してAI評価を生成する",
  },
  {
    href: "/evaluations",
    icon: Sparkles,
    label: "AI週次評価",
    description: "AIが生成した週ごとの評価を確認する",
  },
];

export function QuickLinks() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {QUICK_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col gap-2 rounded-2xl border border-app-border bg-app-card p-5 transition-colors hover:bg-app-card-hover"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="font-semibold text-app-text">{link.label}</p>
            <p className="text-sm text-app-text-muted">{link.description}</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-app-text transition-all group-hover:gap-2">
              開く <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </Link>
        );
      })}
    </div>
  );
}
