import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatPeriodLabel, getOwnTermEvaluation, scoreView } from "@/lib/evaluation/get-term";
import { JOB_GRADE_LABELS } from "@/lib/evaluation/score";
import { TermScoreSummary } from "@/components/evaluation/term-score-summary";
import { Card } from "@/components/ui/card";
import { CreateSheetForm, OwnTermSheetForm } from "./own-term-form";

export default async function OwnTermEvaluationPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("evaluation_periods")
    .select("*")
    .eq("id", periodId)
    .maybeSingle();
  if (!period) notFound();

  const view = await getOwnTermEvaluation(profile.id, periodId);

  return (
    <div className="space-y-5">
      <Link
        href="/evaluations/term"
        className="inline-flex items-center gap-1 text-sm text-app-text-muted hover:text-app-text hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        期末評価の一覧に戻る
      </Link>

      <div>
        <h1 className="text-xl font-bold text-app-text">{formatPeriodLabel(period)}</h1>
        <p className="tabular mt-0.5 text-sm text-app-text-muted">
          {period.starts_on} 〜 {period.ends_on} ・ 役職 {JOB_GRADE_LABELS[profile.job_grade]}
        </p>
      </div>

      {!view ? (
        <Card className="gap-3 p-5">
          <h2 className="text-md font-semibold text-app-text">評価シートを作成する</h2>
          <p className="text-sm text-app-text-muted">
            作成すると、行動指針の5項目が自動で入ります。部門定量項目と育成・支援・管理・自己研鑽項目は、
            ご自身で目標を追加してください。
          </p>
          <CreateSheetForm periodId={periodId} />
        </Card>
      ) : (
        <>
          <TermScoreSummary score={scoreView(view, "self")} label="自己評価（暫定）" />

          {view.marksVisible ? (
            <TermScoreSummary score={scoreView(view, "final")} label="最終評価" tone="final" />
          ) : view.evaluation.status === "approved" ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-app-surface px-3.5 py-3 text-xs text-app-text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              承認は完了しています。上長評価は面談後に公開されます。
            </p>
          ) : null}

          <OwnTermSheetForm view={view} />
        </>
      )}
    </div>
  );
}
