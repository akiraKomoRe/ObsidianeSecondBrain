import { createClient } from "@/lib/supabase/server";
import type { Department, DepartmentGoal } from "@/types/database";

/**
 * 部門目標の読み出しと、「誰がどの部門の目標を書けるか」の判定。
 *
 * 部署が入れ子になっているのがこの層の理由。工事第一課 の社員が選べるのは
 * 自部署の目標だけではなく、その上にある 工事本部 の目標も含む —— 課の目標は
 * 本部の目標に奉仕するために立てるものだから。逆に、部長は配下の課の目標も
 * 定められる。どちらも部署の親子をたどる操作で、SQL 側は 0006 の
 * `is_department_head_of()` が再帰CTEで同じことをしている。
 */

export type DepartmentGoalWithDept = DepartmentGoal & { department: Department | null };

/** 自分から上へ、部署の系列。先頭が自部署。 */
export function ancestorChain(
  departments: Department[],
  departmentId: string | null
): Department[] {
  const chain: Department[] = [];
  const seen = new Set<string>();
  let current = departments.find((d) => d.id === departmentId) ?? null;
  while (current && !seen.has(current.id)) {
    chain.push(current);
    seen.add(current.id); // マスタの設定ミスで循環しても止まる
    current = departments.find((d) => d.id === current!.parent_id) ?? null;
  }
  return chain;
}

/** その人がその部署の目標を書けるか（自部署または上位部署の長、あるいは管理者）。 */
export function canEditDepartmentGoals(
  departments: Department[],
  departmentId: string,
  viewer: { id: string; role: string }
): boolean {
  if (viewer.role === "admin") return true;
  return ancestorChain(departments, departmentId).some((d) => d.head_id === viewer.id);
}

/**
 * その人が部門目標を設定できる部署。自分が長を務める部署と、その配下すべて。
 *
 * 配下まで含めるのは、権限がそうなっているから（`canEditDepartmentGoals` は
 * 上位部署の長を許す）だけでなく、課長の席が空いている部署では部長が代わりに
 * 目標を立てるしかないため。画面に出さないと、権限はあるのに手段が無い状態になる。
 */
export function manageableDepartments(departments: Department[], userId: string): Department[] {
  const headed = departments.filter((d) => d.head_id === userId);
  const included = new Set(headed.map((d) => d.id));

  // 親が入っている部署を拾い続ける。1回では孫が漏れるので変化がなくなるまで。
  let grew = true;
  while (grew) {
    grew = false;
    for (const department of departments) {
      if (included.has(department.id)) continue;
      if (department.parent_id && included.has(department.parent_id)) {
        included.add(department.id);
        grew = true;
      }
    }
  }

  return departments.filter((d) => included.has(d.id));
}

/**
 * 本人が自分の部門定量目標に紐づけられる部門目標。
 * 自部署とその上位部署の、その期の目標。
 */
export async function selectableDepartmentGoals(
  departmentId: string | null,
  periodId: string
): Promise<DepartmentGoalWithDept[]> {
  const supabase = await createClient();
  const [{ data: departments }, { data: goals }] = await Promise.all([
    supabase.from("departments").select("*").order("sort_order"),
    supabase.from("department_goals").select("*").eq("period_id", periodId).order("sort_order"),
  ]);

  const chain = ancestorChain(departments ?? [], departmentId);
  const chainIds = new Set(chain.map((d) => d.id));

  return (goals ?? [])
    .filter((goal) => chainIds.has(goal.department_id))
    .map((goal) => ({
      ...goal,
      department: (departments ?? []).find((d) => d.id === goal.department_id) ?? null,
    }))
    // 自部署の目標を先に、上位部署の目標を後に。自分に近いものから選ばせる。
    .sort((a, b) => {
      const depth = (id: string) => chain.findIndex((d) => d.id === id);
      return depth(a.department_id) - depth(b.department_id) || a.sort_order - b.sort_order;
    });
}

/**
 * 表示用に id → 目標 の索引を返す。評価シートの各行が
 * `department_goal_id` しか持たないので、画面側で名前に戻すのに要る。
 */
export async function departmentGoalIndex(
  goalIds: (string | null)[]
): Promise<Map<string, DepartmentGoalWithDept>> {
  const wanted = [...new Set(goalIds.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map();

  const supabase = await createClient();
  const [{ data: departments }, { data: goals }] = await Promise.all([
    supabase.from("departments").select("*"),
    supabase.from("department_goals").select("*").in("id", wanted),
  ]);

  return new Map(
    (goals ?? []).map((goal) => [
      goal.id,
      { ...goal, department: (departments ?? []).find((d) => d.id === goal.department_id) ?? null },
    ])
  );
}
