import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getTeamMember } from "@/lib/team/get-team-member";
import { formatPeriodLabel, getOwnTermEvaluation, scoreView } from "@/lib/evaluation/get-term";
import { JOB_GRADE_LABELS } from "@/lib/evaluation/score";
import { TermScoreSummary } from "@/components/evaluation/term-score-summary";
import { ManagerTermForm } from "./manager-term-form";

export default async function TeamMemberTermDetailPage({
  params,
}: {
  params: Promise<{ memberId: string; periodId: string }>;
}) {
  const { memberId, periodId } = await params;
  const { member } = await getTeamMember(memberId);

  const view = await getOwnTermEvaluation(member.id, periodId);
  if (!view) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`/team/${member.id}/term`}
        className="inline-flex items-center gap-1 text-sm text-app-text-muted hover:text-app-text hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        期の一覧に戻る
      </Link>

      <div>
        <h1 className="text-xl font-bold text-app-text">{formatPeriodLabel(view.period)}</h1>
        <p className="mt-0.5 text-sm text-app-text-muted">
          {member.name} ・ 役職 {JOB_GRADE_LABELS[view.evaluation.job_grade]}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TermScoreSummary score={scoreView(view, "self")} label="本人の自己評価" />
        <TermScoreSummary score={scoreView(view, "manager")} label="上長評価" tone="final" />
      </div>

      <ManagerTermForm view={view} />
    </div>
  );
}
