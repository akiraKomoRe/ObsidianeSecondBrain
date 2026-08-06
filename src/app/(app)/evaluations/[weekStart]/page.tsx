import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatWeekLabel } from "@/lib/date/week";

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
    <div className="space-y-4">
      <Link href="/evaluations" className="text-sm text-slate-500 hover:text-slate-900 hover:underline">
        ← 評価一覧に戻る
      </Link>

      <div>
        <h2 className="text-base font-semibold text-slate-900">
          {formatWeekLabel(evaluation.week_start, evaluation.week_end)} のAI評価
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          生成日時: {new Date(evaluation.generated_at).toLocaleString("ja-JP")}
          {evaluation.model_version ? `（モデル: ${evaluation.model_version}）` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">総評</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{evaluation.overall_summary}</p>
      </div>

      <div className="space-y-3">
        {evaluation.criteria_scores.map((score) => (
          <div key={score.key} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">{score.label}</p>
              <p className="text-sm font-semibold text-slate-700">{score.score} / 5</p>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{score.comment}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        これはAIによる週次評価のドラフトです。最終的な評価は上長が確認のうえ確定します。
      </p>
    </div>
  );
}
