import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/get-team-member";
import { ReportTimeline } from "@/components/reports/report-timeline";

export default async function TeamMemberDailyPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const { member } = await getTeamMember(memberId);
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", member.id)
    .order("report_date", { ascending: false })
    .limit(30);

  return <ReportTimeline reports={reports ?? []} />;
}
