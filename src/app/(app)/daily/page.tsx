import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/date/week";
import { DailyReportForm } from "./daily-report-form";
import { ReportTimeline } from "@/components/reports/report-timeline";

export default async function DailyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = formatDate(new Date());

  const { data: reports } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", user!.id)
    .order("report_date", { ascending: false })
    .limit(30);

  const todayReport = (reports ?? []).find((r) => r.report_date === today) ?? null;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-xl font-bold text-app-text">日報入力</h1>
        <DailyReportForm today={today} existingReport={todayReport} />
      </section>

      <section>
        <ReportTimeline reports={reports ?? []} />
      </section>
    </div>
  );
}
