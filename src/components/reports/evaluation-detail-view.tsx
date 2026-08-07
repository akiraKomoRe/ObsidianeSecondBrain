import Link from "next/link";
import { ArrowLeft, Info, Sparkles } from "lucide-react";

import { formatWeekLabel } from "@/lib/date/week";
import { ScoreBar } from "@/app/(app)/evaluations/score-bar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { WeeklyAiEvaluation } from "@/types/database";

function scoreBorderClass(score: number): string {
  if (score >= 4) return "border-l-app-success";
  if (score >= 3) return "border-l-primary";
  return "border-l-app-danger";
}

export function EvaluationDetailView({
  evaluation,
  backHref,
}: {
  evaluation: WeeklyAiEvaluation;
  backHref: string;
}) {
  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="flex items-center gap-1 text-sm text-app-text-muted hover:text-app-text hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        評価一覧に戻る
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-app-text">
            {formatWeekLabel(evaluation.week_start, evaluation.week_end)}
          </h1>
          <Badge variant="accent">
            <Sparkles className="h-3 w-3" />
            AIによるドラフト評価
          </Badge>
        </div>
        <p className="mt-1 text-xs text-app-text-faint">
          生成日時: {new Date(evaluation.generated_at).toLocaleString("ja-JP")}
          {evaluation.model_version ? `（モデル: ${evaluation.model_version}）` : ""}
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-app-text">総評</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text-muted">
          {evaluation.overall_summary}
        </p>
      </Card>

      <div className="space-y-3">
        {evaluation.criteria_scores.map((score) => (
          <Card key={score.key} className={`gap-2 border-l-4 p-5 ${scoreBorderClass(score.score)}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-app-text">{score.label}</p>
              <p className="text-sm font-semibold text-app-text">
                {score.score}
                <span className="font-normal text-app-text-faint"> / 5</span>
              </p>
            </div>
            <ScoreBar score={score.score} />
            <p className="whitespace-pre-wrap text-sm text-app-text-muted">{score.comment}</p>
          </Card>
        ))}
      </div>

      <p className="flex items-start gap-1.5 rounded-lg bg-app-surface px-3.5 py-3 text-xs text-app-text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        これはAIによる週次評価のドラフトです。最終的な評価は上長が確認のうえ確定します。
      </p>
    </div>
  );
}
