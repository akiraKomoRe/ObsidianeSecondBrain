import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatWeekLabel } from "@/lib/date/week";
import { ScoreBar } from "../score-bar";

function scoreBorderClass(score: number): string {
  if (score >= 4) return "border-l-app-success";
  if (score >= 3) return "border-l-app-accent";
  return "border-l-app-danger";
}

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ weekStart: string }>;
}) {
  const { weekStart } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: evaluation } = await supabase
    .from("weekly_ai_evaluations")
    .select("*")
    .eq("user_id", user!.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!evaluation) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <Link
        href="/evaluations"
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
          <span className="flex items-center gap-1 rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-semibold text-app-accent">
            <Sparkles className="h-3 w-3" />
            AIによるドラフト評価
          </span>
        </div>
        <p className="mt-1 text-xs text-app-text-faint">
          生成日時: {new Date(evaluation.generated_at).toLocaleString("ja-JP")}
          {evaluation.model_version ? `（モデル: ${evaluation.model_version}）` : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-app-border bg-app-card p-5">
        <h2 className="text-sm font-semibold text-app-text">総評</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text-muted">
          {evaluation.overall_summary}
        </p>
      </div>

      <div className="space-y-3">
        {evaluation.criteria_scores.map((score) => (
          <div
            key={score.key}
            className={`rounded-2xl border border-app-border border-l-4 bg-app-card p-5 ${scoreBorderClass(score.score)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-app-text">{score.label}</p>
              <p className="text-sm font-semibold text-app-text">
                {score.score}
                <span className="font-normal text-app-text-faint"> / 5</span>
              </p>
            </div>
            <div className="mt-2.5">
              <ScoreBar score={score.score} />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-app-text-muted">{score.comment}</p>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-1.5 rounded-xl bg-app-surface px-3.5 py-3 text-xs text-app-text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        これはAIによる週次評価のドラフトです。最終的な評価は上長が確認のうえ確定します。
      </p>
    </div>
  );
}
