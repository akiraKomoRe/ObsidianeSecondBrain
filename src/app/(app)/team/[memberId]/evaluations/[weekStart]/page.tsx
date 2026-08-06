import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/get-team-member";
import { EvaluationDetailView } from "@/components/reports/evaluation-detail-view";

export default async function TeamMemberEvaluationDetailPage({
  params,
}: {
  params: Promise<{ memberId: string; weekStart: string }>;
}) {
  const { memberId, weekStart } = await params;
  const { member } = await getTeamMember(memberId);
  const supabase = await createClient();

  const { data: evaluation } = await supabase
    .from("weekly_ai_evaluations")
    .select("*")
    .eq("user_id", member.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!evaluation) {
    notFound();
  }

  return <EvaluationDetailView evaluation={evaluation} backHref={`/team/${member.id}/evaluations`} />;
}
