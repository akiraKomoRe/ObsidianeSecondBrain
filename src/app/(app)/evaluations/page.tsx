import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatWeekLabel } from "@/lib/date/week";

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
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">AI週次評価</h2>
      <p className="text-sm text-slate-500">
        週報を提出するとAIがその週の日報・週報を読み、評価項目ごとのスコアとコメントを生成します。最終的な評価は上長が確認のうえ確定します。
      </p>

      {!evaluations || evaluations.length === 0 ? (
        <p className="text-sm text-slate-500">まだAI評価がありません。週報を提出すると生成されます。</p>
      ) : (
        <ul className="space-y-3">
          {evaluations.map((evaluation) => {
            const avgScore =
              evaluation.criteria_scores.length > 0
                ? (
                    evaluation.criteria_scores.reduce((sum, s) => sum + s.score, 0) /
                    evaluation.criteria_scores.length
                  ).toFixed(1)
                : "-";

            return (
              <li key={evaluation.id}>
                <Link
                  href={`/evaluations/${evaluation.week_start}`}
                  className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {formatWeekLabel(evaluation.week_start, evaluation.week_end)}
                    </p>
                    <p className="text-sm text-slate-500">平均スコア: {avgScore} / 5</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{evaluation.overall_summary}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
