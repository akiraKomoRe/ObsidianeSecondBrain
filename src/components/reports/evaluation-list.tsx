import Link from "next/link";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { formatWeekLabel } from "@/lib/date/week";
import { ScoreBar, avgScoreOf } from "@/app/(app)/evaluations/score-bar";
import { Card } from "@/components/ui/card";
import type { WeeklyAiEvaluation } from "@/types/database";

export function EvaluationList({
  evaluations,
  basePath,
}: {
  evaluations: WeeklyAiEvaluation[];
  basePath: string;
}) {
  if (evaluations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-app-border bg-app-card px-4 py-8 text-center text-sm text-app-text-muted">
        まだAI評価がありません。週報を提出すると生成されます。
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {evaluations.map((evaluation, index) => {
        const avgScore = avgScoreOf(evaluation.criteria_scores);
        const prevAvgScore =
          index + 1 < evaluations.length ? avgScoreOf(evaluations[index + 1].criteria_scores) : null;
        const trend =
          avgScore === null || prevAvgScore === null
            ? null
            : avgScore > prevAvgScore
              ? "up"
              : avgScore < prevAvgScore
                ? "down"
                : "flat";
        const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
        const trendColor =
          trend === "up" ? "text-app-success" : trend === "down" ? "text-app-danger" : "text-app-text-faint";

        return (
          <li key={evaluation.id}>
            <Link href={`${basePath}/${evaluation.week_start}`} className="block">
              <Card className="gap-2 p-4 transition-colors hover:bg-app-card-hover sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-app-text">
                    {formatWeekLabel(evaluation.week_start, evaluation.week_end)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {trend ? <TrendIcon className={`h-4 w-4 ${trendColor}`} strokeWidth={2.5} /> : null}
                    <span className="text-sm font-semibold text-app-text">
                      {avgScore !== null ? avgScore.toFixed(1) : "-"}
                      <span className="font-normal text-app-text-faint"> / 5</span>
                    </span>
                  </div>
                </div>
                {avgScore !== null ? <ScoreBar score={avgScore} /> : null}
                <p className="line-clamp-2 text-sm text-app-text-muted">{evaluation.overall_summary}</p>
                <p className="flex items-center gap-1 text-xs font-medium text-app-text-faint">
                  詳細を見る <ArrowRight className="h-3 w-3" />
                </p>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
