"use client";

import { useActionState } from "react";

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
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{weekLabel} の日報（{dailyReports.length}件）</h3>
        {dailyReports.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">この週の日報はまだありません。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {dailyReports.map((r) => (
              <li key={r.id} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{r.report_date}</p>
                <p className="whitespace-pre-wrap">{r.work_content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={formAction} className="space-y-3">
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
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.success && !state.error ? (
          <p className="text-sm text-green-600">週報を提出し、AI評価を生成しました。</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "提出中..." : existingReport?.submitted_at ? "週報を再提出してAI評価を更新" : "週報を提出してAI評価を生成"}
        </button>
      </form>
    </div>
  );
}
