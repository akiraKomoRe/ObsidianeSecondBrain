"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { updateMember, type AdminState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Department, JobGrade, Profile, UserRole } from "@/types/database";

const initialState: AdminState = { error: null, success: false };

const GRADES: { value: JobGrade; label: string }[] = [
  { value: "director", label: "取締役" },
  { value: "bucho", label: "部長" },
  { value: "kacho", label: "課長" },
  { value: "kakaricho", label: "係長" },
  { value: "shunin", label: "主任" },
  { value: "ippan", label: "一般" },
];

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: "employee", label: "一般", hint: "自分の日報・評価のみ" },
  { value: "manager", label: "上長", hint: "チーム画面と承認画面" },
  { value: "admin", label: "管理者", hint: "全社＋この管理画面" },
];

const selectClass =
  "h-9 w-full rounded-md border border-app-border bg-app-card px-3 text-sm text-app-text " +
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none";

export function MemberForm({
  profile,
  colleagues,
  departments,
  managerName,
  gradeLabel,
}: {
  profile: Profile;
  departments: Department[];
  /** Everyone except this person -- you cannot be your own manager. */
  colleagues: Profile[];
  managerName: string | null;
  gradeLabel: string;
}) {
  const [state, formAction, pending] = useActionState(updateMember, initialState);

  return (
    <Card className="gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-app-text">{profile.name}</p>
        <p className="text-xs text-app-text-faint">
          {gradeLabel} ／ 上長: {managerName ?? "なし"} ／ {profile.email}
        </p>
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={profile.id} />

        <div className="space-y-1.5">
          <Label htmlFor={`name-${profile.id}`}>氏名</Label>
          <Input id={`name-${profile.id}`} name="name" defaultValue={profile.name} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`department-${profile.id}`}>部署</Label>
          {/*
            フリーテキストから部署マスタの選択に変えた。文字列のままだと
            「工事第一課」と「工事1課」が別部署として扱われ、部門目標の
            紐付け先が割れる。
          */}
          <select
            id={`department-${profile.id}`}
            name="department_id"
            defaultValue={profile.department_id ?? ""}
            className={selectClass}
          >
            <option value="">（未所属）</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`grade-${profile.id}`}>役職（配点ウェイト）</Label>
          <select
            id={`grade-${profile.id}`}
            name="job_grade"
            defaultValue={profile.job_grade}
            className={selectClass}
          >
            {GRADES.map((grade) => (
              <option key={grade.value} value={grade.value}>
                {grade.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`role-${profile.id}`}>権限</Label>
          <select
            id={`role-${profile.id}`}
            name="role"
            defaultValue={profile.role}
            className={selectClass}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}（{role.hint}）
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`manager-${profile.id}`}>上長</Label>
          <select
            id={`manager-${profile.id}`}
            name="manager_id"
            defaultValue={profile.manager_id ?? ""}
            className={selectClass}
          >
            <option value="">（設定なし）</option>
            {colleagues.map((colleague) => (
              <option key={colleague.id} value={colleague.id}>
                {colleague.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-app-text-faint">
            ここで選んだ人が評価し、さらにその人の上長が二次承認します。
          </p>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            保存
          </Button>
          {state.success ? (
            <span className="flex items-center gap-1 text-sm text-app-success">
              <Check className="h-4 w-4" />
              保存しました
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
