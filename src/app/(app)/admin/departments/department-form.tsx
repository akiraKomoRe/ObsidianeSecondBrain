"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Loader2, Plus } from "lucide-react";

import { saveDepartment, type AdminState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Department, Profile } from "@/types/database";

const initialState: AdminState = { error: null, success: false };

const selectClass =
  "h-9 w-full rounded-md border border-app-border bg-app-card px-3 text-sm text-app-text " +
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none";

export function DepartmentForm({
  department,
  departments,
  people,
  memberCount,
}: {
  /** null なら新規追加フォーム。 */
  department: Department | null;
  departments: Department[];
  people: Profile[];
  memberCount?: number;
}) {
  const [state, formAction, pending] = useActionState(saveDepartment, initialState);
  const key = department?.id ?? "new";

  return (
    <Card className="gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-md font-semibold text-app-text">
          {department ? department.name : "部署を追加"}
        </h2>
        {department ? (
          <p className="text-xs text-app-text-faint">所属 {memberCount ?? 0}名</p>
        ) : null}
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {department ? <input type="hidden" name="id" value={department.id} /> : null}

        <div className="space-y-1.5">
          <Label htmlFor={`dept-name-${key}`}>部署名</Label>
          <Input
            id={`dept-name-${key}`}
            name="name"
            defaultValue={department?.name ?? ""}
            placeholder="例: 工事第一課"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`dept-parent-${key}`}>上位部署</Label>
          <select
            id={`dept-parent-${key}`}
            name="parent_id"
            defaultValue={department?.parent_id ?? ""}
            className={selectClass}
          >
            <option value="">（なし）</option>
            {departments
              .filter((d) => d.id !== department?.id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`dept-head-${key}`}>部長</Label>
          <select
            id={`dept-head-${key}`}
            name="head_id"
            defaultValue={department?.head_id ?? ""}
            className={selectClass}
          >
            <option value="">（未設定）</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : department ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {department ? "保存" : "追加"}
          </Button>
          {state.success ? (
            <span className="flex items-center gap-1 text-sm text-app-success">
              <Check className="h-4 w-4" />
              {department ? "保存しました" : "登録しました"}
            </span>
          ) : null}
          {state.error ? (
            <span className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
