"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { canEditDepartmentGoals } from "@/lib/evaluation/department-goals";
import type { Profile } from "@/types/database";

export type DepartmentGoalState = { error: string | null; success: boolean };

/**
 * 誰がこの部署の目標を触ってよいか。
 *
 * 画面を出さないことは権限ではない。ここで断らないと、フォームを直接叩けば
 * 他部署の目標を書き換えられてしまう。SQL 側は 0006 の
 * `department_goals_*_head` ポリシーが同じ判定をしている。
 */
type Denied = { error: string };
type Allowed = {
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

async function requireHead(
  departmentId: string,
  periodId?: string
): Promise<Allowed | Denied> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: departments } = await supabase.from("departments").select("*");
  if (!canEditDepartmentGoals(departments ?? [], departmentId, profile)) {
    return { error: "この部署の部門目標を編集する権限がありません。" };
  }

  // 締めた期の目標を動かせてしまうと、確定済みの期末評価の根拠があとから
  // 書き換わる。0006 のトリガーと同じ条件をここでも見る。
  if (periodId) {
    const { data: period } = await supabase
      .from("evaluation_periods")
      .select("status")
      .eq("id", periodId)
      .maybeSingle();
    if (!period) return { error: "対象の評価期間が見つかりません。" };
    if (period.status === "closed") {
      return { error: "終了した評価期間の部門目標は変更できません。" };
    }
  }

  return { profile, supabase };
}

function isDenied(result: Allowed | Denied): result is Denied {
  return "error" in result;
}

export async function saveDepartmentGoal(
  _prev: DepartmentGoalState,
  formData: FormData
): Promise<DepartmentGoalState> {
  const departmentId = String(formData.get("department_id") ?? "");
  const periodId = String(formData.get("period_id") ?? "");
  const goalId = String(formData.get("goal_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!departmentId || !periodId) return { error: "対象が指定されていません。", success: false };
  if (!title) return { error: "目標の内容を入力してください。", success: false };

  const allowed = await requireHead(departmentId, periodId);
  if (isDenied(allowed)) return { error: allowed.error, success: false };
  const { profile, supabase } = allowed;

  const patch = {
    title,
    description: String(formData.get("description") ?? "").trim(),
    target_metric: String(formData.get("target_metric") ?? "").trim(),
  };

  if (goalId) {
    // .select() を付けるのは、ポリシーが1行も掴まなかった場合を「保存しました」
    // と表示しないため。0行の更新は成功ではない。
    const { data, error } = await supabase
      .from("department_goals")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", goalId)
      .eq("department_id", departmentId)
      .select("id");
    if (error || !data?.length) return { error: "保存に失敗しました。", success: false };
  } else {
    const { count } = await supabase
      .from("department_goals")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId)
      .eq("period_id", periodId);

    const { data, error } = await supabase
      .from("department_goals")
      .insert({
        department_id: departmentId,
        period_id: periodId,
        sort_order: ((count ?? 0) + 1) * 10,
        created_by: profile.id,
        ...patch,
      })
      .select("id");
    if (error || !data?.length) return { error: "追加に失敗しました。", success: false };
  }

  revalidatePath("/team/department-goals");
  revalidatePath("/evaluations/term");
  return { error: null, success: true };
}

export async function deleteDepartmentGoal(
  _prev: DepartmentGoalState,
  formData: FormData
): Promise<DepartmentGoalState> {
  const goalId = String(formData.get("goal_id") ?? "");
  const supabase = await createClient();

  // どの部署の目標かで権限が決まるので、フォームから来た id を信じずに
  // 先に行を読む。
  const { data: goal } = await supabase
    .from("department_goals")
    .select("*")
    .eq("id", goalId)
    .maybeSingle();
  if (!goal) return { error: "対象の部門目標が見つかりません。", success: false };

  const allowed = await requireHead(goal.department_id, goal.period_id);
  if (isDenied(allowed)) return { error: allowed.error, success: false };

  // 個人目標が既にこの部門目標に紐づいている場合、消すと紐付けだけが
  // 静かに外れる。何に向けて立てた目標だったのか分からなくなるので、
  // 先に外してもらう。
  const { count } = await supabase
    .from("term_evaluation_items")
    .select("id", { count: "exact", head: true })
    .eq("department_goal_id", goalId);
  if ((count ?? 0) > 0) {
    return {
      error: `この部門目標には個人目標が${count}件紐づいています。先に紐付けを外してください。`,
      success: false,
    };
  }

  const { data: deleted, error } = await allowed.supabase
    .from("department_goals")
    .delete()
    .eq("id", goalId)
    .select("id");

  if (error || !deleted?.length) return { error: "削除に失敗しました。", success: false };

  revalidatePath("/team/department-goals");
  return { error: null, success: true };
}
