"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Loader2, Plus } from "lucide-react";

import { createPeriod, setPeriodStatus, type AdminState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AdminState = { error: null, success: false };

const selectClass =
  "h-9 w-full rounded-md border border-app-border bg-app-card px-3 text-sm text-app-text " +
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none";

export function PeriodForm({ defaultYear }: { defaultYear: number }) {
  const [state, formAction, pending] = useActionState(createPeriod, initialState);

  return (
    <Card className="gap-3 p-5">
      <h2 className="text-md font-semibold text-app-text">評価期間を追加</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="w-28 space-y-1.5">
          <Label htmlFor="period-year">年</Label>
          <Input id="period-year" name="year" type="number" defaultValue={defaultYear} required />
        </div>
        <div className="w-40 space-y-1.5">
          <Label htmlFor="period-half">期</Label>
          <select id="period-half" name="half" defaultValue="H1" className={selectClass}>
            <option value="H1">上期（1-6月）</option>
            <option value="H2">下期（7-12月）</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          追加
        </Button>
        {state.success ? (
          <span className="flex items-center gap-1 text-sm text-app-success">
            <Check className="h-4 w-4" />
            登録しました
          </span>
        ) : null}
        {state.error ? (
          <span className="flex items-start gap-1.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </span>
        ) : null}
      </form>
    </Card>
  );
}

export function PeriodStatusButton({ id, next }: { id: string; next: "open" | "closed" }) {
  const [state, formAction, pending] = useActionState(setPeriodStatus, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {next === "closed" ? "締め切る" : "再開する"}
      </Button>
      {state.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
    </form>
  );
}
