import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/get-team-member";
import { EvaluationList } from "@/components/reports/evaluation-list";

export default async function TeamMemberEvaluationsPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const { member } = await getTeamMember(memberId);
  const supabase = await createClient();

  const { data: evaluations } = await supabase
    .from("weekly_ai_evaluations")
    .select("*")
    .eq("user_id", member.id)
    .order("week_start", { ascending: false });

  return <EvaluationList evaluations={evaluations ?? []} basePath={`/team/${member.id}/evaluations`} />;
}
