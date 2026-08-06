"use client";

import { useActionState, useEffect, useRef } from "react";

import { saveDailyReport, type DailyReportState } from "./actions";
import type { DailyReport } from "@/types/database";

const initialState: DailyReportState = { error: null, success: false };

export function DailyReportForm({
  today,
  existingReport,
}: {
  today: string;
  existingReport: DailyReport | null;
}) {
  const [state, formAction, pending] = useActionState(saveDailyReport, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <label htmlFor="report_date" className="block text-sm font-medium text-slate-700">
          日付
        </label>
        <input
          id="report_date"
          name="report_date"
          type="date"
          required
          defaultValue={existingReport?.report_date ?? today}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="work_content" className="block text-sm font-medium text-slate-700">
          作業内容
        </label>
        <textarea
          id="work_content"
          name="work_content"
          required
          rows={3}
          defaultValue={existingReport?.work_content ?? ""}
          placeholder="本日行った作業内容を記入してください"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="work_hours" className="block text-sm font-medium text-slate-700">
          工数（時間）
        </label>
        <input
          id="work_hours"
          name="work_hours"
          type="number"
          step="0.5"
          min={0}
          max={24}
          defaultValue={existingReport?.work_hours ?? ""}
          className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="issues" className="block text-sm font-medium text-slate-700">
          課題・気づき
        </label>
        <textarea
          id="issues"
          name="issues"
          rows={2}
          defaultValue={existingReport?.issues ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="tomorrow_plan" className="block text-sm font-medium text-slate-700">
          明日の予定
        </label>
        <textarea
          id="tomorrow_plan"
          name="tomorrow_plan"
          rows={2}
          defaultValue={existingReport?.tomorrow_plan ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">保存しました。</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "保存中..." : "日報を保存"}
      </button>
    </form>
  );
}
