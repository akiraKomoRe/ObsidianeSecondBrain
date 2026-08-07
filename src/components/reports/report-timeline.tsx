"use client";

import { ChevronDown } from "lucide-react";

import { parseDate } from "@/lib/date/week";
import { Card, CardHeader } from "@/components/ui/section-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DailyReport } from "@/types/database";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function ReportTimeline({ reports }: { reports: DailyReport[] }) {
  if (reports.length === 0) {
    return (
      <div>
        <h2 className="mb-3 text-base font-semibold text-app-text">これまでの日報</h2>
        <p className="rounded-2xl border border-dashed border-app-border bg-app-card px-4 py-6 text-center text-sm text-app-text-muted">
          まだ日報がありません。
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title="これまでの日報" count={reports.length} />
      <ul className="divide-y divide-app-border">
        {reports.map((report) => {
          const date = parseDate(report.report_date);
          return (
            <li key={report.id}>
              <Collapsible className="group/item">
                <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left hover:bg-app-card-hover">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-app-surface text-[11px] font-semibold leading-none text-app-text-muted">
                      <span>{date.getDate()}</span>
                      <span className="mt-0.5 text-[9px] text-app-text-faint">{WEEKDAY_LABELS[date.getDay()]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-app-text">{report.report_date}</p>
                      <p className="truncate text-xs text-app-text-muted">{report.work_content || "(内容なし)"}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {report.work_hours !== null ? (
                      <span className="text-xs font-medium text-app-accent">{report.work_hours}h</span>
                    ) : null}
                    <ChevronDown className="h-4 w-4 text-app-text-faint transition-transform group-data-[state=open]/item:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 border-t border-app-border-soft bg-app-card-hover px-5 py-3 text-sm text-app-text">
                  <p className="whitespace-pre-wrap">{report.work_content}</p>
                  {report.issues ? (
                    <p className="text-xs text-app-text-muted">
                      <span className="font-medium text-app-text">課題・気づき: </span>
                      {report.issues}
                    </p>
                  ) : null}
                  {report.tomorrow_plan ? (
                    <p className="text-xs text-app-text-muted">
                      <span className="font-medium text-app-text">明日の予定: </span>
                      {report.tomorrow_plan}
                    </p>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
