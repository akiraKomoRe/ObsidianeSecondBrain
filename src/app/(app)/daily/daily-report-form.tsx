"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Minus, Plus } from "lucide-react";

import { saveDailyReport, type DailyReportState } from "./actions";
import type { DailyReport } from "@/types/database";

const initialState: DailyReportState = { error: null, success: false };

const inputClass =
  "mt-1.5 w-full rounded-xl border border-app-border px-3.5 py-2.5 text-sm text-app-text transition-colors focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/20";

export function DailyReportForm({
  today,
  existingReport,
}: {
  today: string;
  existingReport: DailyReport | null;
}) {
  const [state, formAction, pending] = useActionState(saveDailyReport, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const workHoursRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const adjustHours = (delta: number) => {
    const input = workHoursRef.current;
    if (!input) return;
    const base = input.valueAsNumber || 0;
    input.valueAsNumber = Math.min(24, Math.max(0, Math.round((base + delta) * 2) / 2));
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-5 rounded-2xl border border-app-border bg-app-card p-5 sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="report_date" className="block text-sm font-medium text-app-text-muted">
            日付
          </label>
          <input
            id="report_date"
            name="report_date"
            type="date"
            required
            defaultValue={existingReport?.report_date ?? today}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="work_hours" className="block text-sm font-medium text-app-text-muted">
            工数（時間）
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustHours(-0.5)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-border text-app-text-muted transition-colors hover:bg-app-card-hover"
              aria-label="工数を減らす"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              ref={workHoursRef}
              id="work_hours"
              name="work_hours"
              type="number"
              step="0.5"
              min={0}
              max={24}
              defaultValue={existingReport?.work_hours ?? ""}
              className="w-full rounded-xl border border-app-border px-3 py-2.5 text-center text-sm text-app-text focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/20"
            />
            <button
              type="button"
              onClick={() => adjustHours(0.5)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-border text-app-text-muted transition-colors hover:bg-app-card-hover"
              aria-label="工数を増やす"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="work_content" className="block text-sm font-medium text-app-text-muted">
          作業内容
        </label>
        <textarea
          id="work_content"
          name="work_content"
          required
          rows={3}
          defaultValue={existingReport?.work_content ?? ""}
          placeholder="本日行った作業内容を記入してください"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="issues" className="block text-sm font-medium text-app-text-muted">
          課題・気づき
        </label>
        <textarea
          id="issues"
          name="issues"
          rows={2}
          defaultValue={existingReport?.issues ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="tomorrow_plan" className="block text-sm font-medium text-app-text-muted">
          明日の予定
        </label>
        <textarea
          id="tomorrow_plan"
          name="tomorrow_plan"
          rows={2}
          defaultValue={existingReport?.tomorrow_plan ?? ""}
          className={inputClass}
        />
      </div>

      {state.error ? (
        <p className="flex items-start gap-1.5 text-sm text-app-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="flex items-center gap-1.5 text-sm text-app-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          保存しました。
        </p>
      ) : null}

      <div className="sticky bottom-4 sm:static">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-app-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-app-accent/20 transition-colors hover:bg-app-accent-hover disabled:opacity-50 sm:w-auto sm:shadow-none"
        >
          {pending ? "保存中..." : "日報を保存"}
        </button>
      </div>
    </form>
  );
}
