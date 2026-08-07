"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Minus, Plus } from "lucide-react";

import { saveDailyReport, type DailyReportState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <Card className="p-0">
      <form ref={formRef} action={formAction} className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="report_date">日付</Label>
            <Input
              id="report_date"
              name="report_date"
              type="date"
              required
              defaultValue={existingReport?.report_date ?? today}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="work_hours">工数（時間）</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustHours(-0.5)}
                aria-label="工数を減らす"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                ref={workHoursRef}
                id="work_hours"
                name="work_hours"
                type="number"
                step="0.5"
                min={0}
                max={24}
                defaultValue={existingReport?.work_hours ?? ""}
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustHours(0.5)}
                aria-label="工数を増やす"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="work_content">作業内容</Label>
          <Textarea
            id="work_content"
            name="work_content"
            required
            rows={3}
            defaultValue={existingReport?.work_content ?? ""}
            placeholder="本日行った作業内容を記入してください"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="issues">課題・気づき</Label>
          <Textarea id="issues" name="issues" rows={2} defaultValue={existingReport?.issues ?? ""} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tomorrow_plan">明日の予定</Label>
          <Textarea
            id="tomorrow_plan"
            name="tomorrow_plan"
            rows={2}
            defaultValue={existingReport?.tomorrow_plan ?? ""}
          />
        </div>

        {state.error ? (
          <p className="flex items-start gap-1.5 text-sm text-destructive">
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
          <Button
            type="submit"
            disabled={pending}
            className="w-full shadow-lg shadow-app-accent/20 sm:w-auto sm:shadow-none"
          >
            {pending ? "保存中..." : "日報を保存"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
