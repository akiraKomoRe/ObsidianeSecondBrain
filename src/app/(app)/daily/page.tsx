import { CalendarOff } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/date/week";
import { getDayOff } from "@/lib/attendance/working-days";
import { DailyReportForm } from "./daily-report-form";
import { ReportTimeline } from "@/components/reports/report-timeline";

export default async function DailyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = formatDate(new Date());
  const dayOff = await getDayOff(user!.id, today);

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

        {dayOff && !todayReport ? (
          // 休みの日は提出義務が無い。フォームを消さずに残してあるのは、
          // 休み中に前日ぶんを書き足したい場合があるため —— 消えるのは義務であって
          // 手段ではない。
          <div className="mb-4 flex items-start gap-2.5 rounded-md border border-app-border bg-app-surface px-4 py-3">
            <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-app-text-muted" />
            <div className="text-sm">
              <p className="font-medium text-app-text">本日は{dayOff.label}です。日報の提出は不要です。</p>
              <p className="mt-0.5 text-app-text-muted">
                提出状況の集計からも除外されます。別の日の日報を入力する場合は、下の日付を変更してください。
              </p>
            </div>
          </div>
        ) : null}

        <DailyReportForm today={today} existingReport={todayReport} />
      </section>

      <section>
        <ReportTimeline reports={reports ?? []} />
      </section>
    </div>
  );
}
