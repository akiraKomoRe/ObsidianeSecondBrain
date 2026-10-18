"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { submitWeeklyReport, type WeeklyReportState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DailyReport, WeeklyReport } from "@/types/database";

const initialState: WeeklyReportState = { error: null, success: false };

export function WeeklyReportForm({
  weekStart,
  weekEnd,
  weekLabel,
  dailyReports,
  existingReport,
}: {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  dailyReports: DailyReport[];
  existingReport: WeeklyReport | null;
}) {
  const [state, formAction, pending] = useActionState(submitWeeklyReport, initialState);

  return (
    <Card className="gap-5 p-5 sm:p-6">
      <div>
        <h3 className="text-sm font-semibold text-app-text">
          {weekLabel} の日報 <span className="font-normal text-app-text-faint">（{dailyReports.length}件）</span>
        </h3>
        {dailyReports.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-app-border px-3 py-4 text-center text-sm text-app-text-muted">
            この週の日報はまだありません。
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-app-border overflow-hidden rounded-lg border border-app-border">
            {dailyReports.map((r) => (
              <li key={r.id} className="px-3.5 py-3 text-sm text-app-text">
                <p className="font-medium text-app-text">{r.report_date}</p>
                <p className="whitespace-pre-wrap text-app-text-muted">{r.work_content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="week_start" value={weekStart} />
        <input type="hidden" name="week_end" value={weekEnd} />

        <div className="space-y-1.5">
          <Label htmlFor="self_reflection">今週の振り返り</Label>
          <Textarea
            id="self_reflection"
            name="self_reflection"
            rows={4}
            defaultValue={existingReport?.self_reflection ?? ""}
            placeholder="今週の成果や課題、来週に向けて意識したいことなどを記入してください"
          />
        </div>

        {state.error ? (
          <p className="flex items-start gap-1.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </p>
        ) : null}
        {state.success && !state.error ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-app-success/30 bg-app-success-soft px-3.5 py-3 text-sm text-app-success">
            <span className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              週報を提出し、AI評価を生成しました。
            </span>
            <Link href={`/evaluations/${weekStart}`} className="shrink-0 font-medium underline">
              確認する
            </Link>
          </div>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              AIが週報を分析中...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {existingReport?.submitted_at ? "週報を再提出してAI評価を更新" : "週報を提出してAI評価を生成"}
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
