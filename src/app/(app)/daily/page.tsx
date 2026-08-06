import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/date/week";
import { DailyReportForm } from "./daily-report-form";
import type { DailyReport } from "@/types/database";

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
        <h2 className="mb-3 text-base font-semibold text-slate-900">日報入力</h2>
        <DailyReportForm today={today} existingReport={todayReport} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">これまでの日報</h2>
        <ReportList reports={reports ?? []} />
      </section>
    </div>
  );
}

function ReportList({ reports }: { reports: DailyReport[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-slate-500">まだ日報がありません。</p>;
  }

  return (
    <ul className="space-y-3">
      {reports.map((report) => (
        <li key={report.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">{report.report_date}</p>
            {report.work_hours !== null ? (
              <p className="text-xs text-slate-500">工数: {report.work_hours}h</p>
            ) : null}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{report.work_content}</p>
          {report.issues ? (
            <p className="mt-2 text-xs text-slate-500">課題・気づき: {report.issues}</p>
          ) : null}
          {report.tomorrow_plan ? (
            <p className="mt-1 text-xs text-slate-500">明日の予定: {report.tomorrow_plan}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
