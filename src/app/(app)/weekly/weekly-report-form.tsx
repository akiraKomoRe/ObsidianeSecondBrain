"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { submitWeeklyReport, type WeeklyReportState } from "./actions";
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
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {weekLabel} の日報 <span className="font-normal text-slate-400">（{dailyReports.length}件）</span>
        </h3>
        {dailyReports.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
            この週の日報はまだありません。
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {dailyReports.map((r) => (
              <li key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{r.report_date}</p>
                <p className="whitespace-pre-wrap">{r.work_content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="week_start" value={weekStart} />
        <input type="hidden" name="week_end" value={weekEnd} />

        <div>
          <label htmlFor="self_reflection" className="block text-sm font-medium text-slate-700">
            今週の振り返り
          </label>
          <textarea
            id="self_reflection"
            name="self_reflection"
            rows={4}
            defaultValue={existingReport?.self_reflection ?? ""}
            placeholder="今週の成果や課題、来週に向けて意識したいことなどを記入してください"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        {state.error ? (
          <p className="flex items-start gap-1.5 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </p>
        ) : null}
        {state.success && !state.error ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">
            <span className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              週報を提出し、AI評価を生成しました。
            </span>
            <Link href={`/evaluations/${weekStart}`} className="shrink-0 font-medium underline">
              確認する
            </Link>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-60 sm:w-auto"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              AIが週報を分析中...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-amber-400" />
              {existingReport?.submitted_at ? "週報を再提出してAI評価を更新" : "週報を提出してAI評価を生成"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
