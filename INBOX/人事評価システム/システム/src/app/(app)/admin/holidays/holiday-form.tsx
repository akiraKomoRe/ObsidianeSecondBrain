"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Loader2, Plus, Trash2 } from "lucide-react";

import { addCompanyHoliday, deleteCompanyHoliday, type AdminState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AdminState = { error: null, success: false };

export function HolidayForm() {
  const [state, formAction, pending] = useActionState(addCompanyHoliday, initialState);

  return (
    <Card className="gap-3 p-5">
      <h2 className="text-md font-semibold text-app-text">会社休日を追加</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="w-44 space-y-1.5">
          <Label htmlFor="holiday-on">日付</Label>
          <Input id="holiday-on" name="holiday_on" type="date" required />
        </div>
        <div className="w-56 space-y-1.5">
          <Label htmlFor="holiday-label">名称</Label>
          <Input id="holiday-label" name="label" placeholder="例: 山の日" />
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

export function HolidayDeleteButton({ holidayOn }: { holidayOn: string }) {
  const [state, formAction, pending] = useActionState(deleteCompanyHoliday, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="holiday_on" value={holidayOn} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={`${holidayOn} を削除`}
        disabled={pending}
        className="text-app-text-faint hover:text-destructive"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
      {state.error ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
