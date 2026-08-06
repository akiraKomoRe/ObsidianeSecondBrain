import { ChevronDown } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, parseDate } from "@/lib/date/week";
import { DailyReportForm } from "./daily-report-form";
import type { DailyReport } from "@/types/database";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

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
        <h1 className="mb-3 text-xl font-bold text-slate-900">日報入力</h1>
        <DailyReportForm today={today} existingReport={todayReport} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">これまでの日報</h2>
        <ReportTimeline reports={reports ?? []} />
      </section>
    </div>
  );
}

function ReportTimeline({ reports }: { reports: DailyReport[] }) {
  if (reports.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        まだ日報がありません。
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {reports.map((report) => {
        const date = parseDate(report.report_date);
        return (
          <li key={report.id}>
            <details className="group rounded-2xl border border-slate-200 bg-white open:shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold leading-none text-slate-600">
                    <span>{date.getDate()}</span>
                    <span className="mt-0.5 text-[9px] text-slate-400">{WEEKDAY_LABELS[date.getDay()]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{report.report_date}</p>
                    <p className="truncate text-xs text-slate-500">{report.work_content || "(内容なし)"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {report.work_hours !== null ? (
                    <span className="text-xs text-slate-400">{report.work_hours}h</span>
                  ) : null}
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                </div>
              </summary>
              <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
                <p className="whitespace-pre-wrap">{report.work_content}</p>
                {report.issues ? (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600">課題・気づき: </span>
                    {report.issues}
                  </p>
                ) : null}
                {report.tomorrow_plan ? (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600">明日の予定: </span>
                    {report.tomorrow_plan}
                  </p>
                ) : null}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
