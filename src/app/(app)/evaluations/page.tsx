import Link from "next/link";
import { ArrowRight, Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatWeekLabel } from "@/lib/date/week";
import { ScoreBar, avgScoreOf } from "./score-bar";

export default async function EvaluationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: evaluations } = await supabase
    .from("weekly_ai_evaluations")
    .select("*")
    .eq("user_id", user!.id)
    .order("week_start", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-app-text">
          <Sparkles className="h-5 w-5 text-app-accent" />
          AI週次評価
        </h1>
        <p className="mt-1 text-sm text-app-text-muted">
          週報を提出するとAIがその週の日報・週報を読み、評価項目ごとのスコアとコメントを生成します。最終的な評価は上長が確認のうえ確定します。
        </p>
      </div>

      {!evaluations || evaluations.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-app-border bg-app-card px-4 py-8 text-center text-sm text-app-text-muted">
          まだAI評価がありません。週報を提出すると生成されます。
        </p>
      ) : (
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
                <Link
                  href={`/evaluations/${evaluation.week_start}`}
                  className="block rounded-2xl border border-app-border bg-app-card p-4 transition-colors hover:bg-app-card-hover sm:p-5"
                >
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
                  {avgScore !== null ? (
                    <div className="mt-2.5">
                      <ScoreBar score={avgScore} />
                    </div>
                  ) : null}
                  <p className="mt-3 line-clamp-2 text-sm text-app-text-muted">{evaluation.overall_summary}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-app-text-faint">
                    詳細を見る <ArrowRight className="h-3 w-3" />
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
