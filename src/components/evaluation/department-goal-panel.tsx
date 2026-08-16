import { Target } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { DepartmentGoalWithDept } from "@/lib/evaluation/department-goals";

/**
 * この期の部門目標を、評価シートの上に一覧で置く。
 *
 * 紐付けのselectだけだと、選択肢の一行しか読めない。何を目指している部門なのか、
 * 何をもって達成とするのかを見てから自分の目標を書けるように、全文を出す。
 */
export function DepartmentGoalPanel({ goals }: { goals: DepartmentGoalWithDept[] }) {
  if (goals.length === 0) return null;

  return (
    <Card className="gap-0 py-0">
      <div className="border-b border-app-border px-5 py-3.5">
        <h2 className="text-md font-semibold text-app-text">この期の部門目標</h2>
        <p className="mt-0.5 text-xs text-app-text-muted">
          部門定量項目は、これらのうちどれに向けた目標かを選べます。
        </p>
      </div>
      <ul className="divide-y divide-app-border-soft">
        {goals.map((goal) => (
          <li key={goal.id} className="space-y-1 px-5 py-3.5">
            <p className="flex items-start gap-2 text-sm font-medium text-app-text">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-app-text-faint" />
              <span>
                {goal.department?.name ? (
                  <span className="text-app-text-faint">[{goal.department.name}] </span>
                ) : null}
                {goal.title}
              </span>
            </p>
            {goal.description ? (
              <p className="pl-6 text-sm text-app-text-muted">{goal.description}</p>
            ) : null}
            {goal.target_metric ? (
              <p className="pl-6 text-xs text-app-text-faint">達成基準: {goal.target_metric}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
