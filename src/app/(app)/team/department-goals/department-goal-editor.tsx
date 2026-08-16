"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, Loader2, Plus, Target, Trash2 } from "lucide-react";

import {
  deleteDepartmentGoal,
  saveDepartmentGoal,
  type DepartmentGoalState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Department, DepartmentGoal } from "@/types/database";

const initialState: DepartmentGoalState = { error: null, success: false };

export function DepartmentGoalEditor({
  department,
  parentName,
  periodId,
  periodClosed,
  goals,
  linkCount,
}: {
  department: Department;
  parentName: string | null;
  periodId: string;
  periodClosed: boolean;
  goals: DepartmentGoal[];
  linkCount: Record<string, number>;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border px-5 py-3.5">
        <div>
          <h2 className="text-md font-semibold text-app-text">{department.name}</h2>
          {parentName ? (
            <p className="text-xs text-app-text-faint">{parentName} の配下</p>
          ) : null}
        </div>
        {!periodClosed ? (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="h-3.5 w-3.5" />
            目標を追加
          </Button>
        ) : (
          <p className="text-xs text-app-text-faint">締切済みの期は編集できません</p>
        )}
      </div>

      <div className="divide-y divide-app-border">
        {goals.length === 0 && !adding ? (
          <p className="px-5 py-6 text-sm text-app-text-muted">
            この期の部門目標はまだありません。
            {periodClosed ? "" : "「目標を追加」から登録してください。"}
          </p>
        ) : null}

        {goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            departmentId={department.id}
            periodId={periodId}
            readOnly={periodClosed}
            linked={linkCount[goal.id] ?? 0}
          />
        ))}

        {adding ? (
          <GoalRow
            goal={null}
            departmentId={department.id}
            periodId={periodId}
            readOnly={false}
            linked={0}
            onCancel={() => setAdding(false)}
          />
        ) : null}
      </div>
    </Card>
  );
}

function GoalRow({
  goal,
  departmentId,
  periodId,
  readOnly,
  linked,
  onCancel,
}: {
  goal: DepartmentGoal | null;
  departmentId: string;
  periodId: string;
  readOnly: boolean;
  linked: number;
  onCancel?: () => void;
}) {
  const [saveState, saveAction, saving] = useActionState(saveDepartmentGoal, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteDepartmentGoal,
    initialState
  );

  if (readOnly && goal) {
    return (
      <div className="space-y-1.5 px-5 py-4">
        <p className="flex items-start gap-2 text-sm font-medium text-app-text">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-app-text-faint" />
          {goal.title}
        </p>
        {goal.description ? (
          <p className="pl-6 text-sm text-app-text-muted">{goal.description}</p>
        ) : null}
        {goal.target_metric ? (
          <p className="pl-6 text-xs text-app-text-faint">達成基準: {goal.target_metric}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 px-5 py-4">
      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="department_id" value={departmentId} />
        <input type="hidden" name="period_id" value={periodId} />
        {goal ? <input type="hidden" name="goal_id" value={goal.id} /> : null}

        <div className="space-y-1.5">
          <Label htmlFor={`title-${goal?.id ?? "new"}`}>目標</Label>
          <Input
            id={`title-${goal?.id ?? "new"}`}
            name="title"
            defaultValue={goal?.title ?? ""}
            placeholder="例: 重大災害ゼロを継続し、ヒヤリハット報告を定着させる"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`description-${goal?.id ?? "new"}`}>背景・意図（任意）</Label>
          <Textarea
            id={`description-${goal?.id ?? "new"}`}
            name="description"
            rows={2}
            defaultValue={goal?.description ?? ""}
            placeholder="なぜこの目標なのか。部下が自分の目標を立てるときの手がかりになります。"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`metric-${goal?.id ?? "new"}`}>達成基準</Label>
          <Input
            id={`metric-${goal?.id ?? "new"}`}
            name="target_metric"
            defaultValue={goal?.target_metric ?? ""}
            placeholder="例: 重大災害0件／ヒヤリハット報告 月10件以上"
          />
          <p className="text-xs text-app-text-faint">
            定量目標の紐付け先なので、何をもって達成とするかを書いておくと部下が測れます。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {goal ? "保存" : "追加"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              キャンセル
            </Button>
          ) : null}
          {saveState.success ? (
            <span className="text-sm text-app-success">保存しました</span>
          ) : null}
          {saveState.error ? (
            <span className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {saveState.error}
            </span>
          ) : null}
        </div>
      </form>

      {goal ? (
        // 削除は別フォーム。<form> は入れ子にできないので、保存フォームの
        // 外に並べる（期末評価シートと同じ扱い）。
        <form action={deleteAction} className="flex items-center gap-3">
          <input type="hidden" name="goal_id" value={goal.id} />
          <Button type="submit" variant="ghost" size="sm" disabled={deleting || linked > 0}>
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            削除
          </Button>
          {linked > 0 ? (
            <span className="text-xs text-app-text-faint">
              個人目標{linked}件が紐づいているため削除できません
            </span>
          ) : null}
          {deleteState.error ? (
            <span className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {deleteState.error}
            </span>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
