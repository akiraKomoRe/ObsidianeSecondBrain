"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import type { JobGrade, Profile, UserRole } from "@/types/database";

export type AdminState = { error: string | null; success: boolean };

const JOB_GRADES: JobGrade[] = ["director", "bucho", "kacho", "kakaricho", "shunin", "ippan"];
const ROLES: UserRole[] = ["employee", "manager", "admin"];

async function requireAdmin(): Promise<Profile | null> {
  const profile = await getCurrentProfile();
  return profile.role === "admin" ? profile : null;
}

/**
 * Set a person's role, job grade and manager.
 *
 * Together these three decide what someone can see, how their term score is
 * weighted, and who evaluates them -- so this is admin-only both here and at
 * the storage layer (migration 0004's trigger / the local policy's
 * privileged-column guard).
 */
export async function updateMember(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます。", success: false };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const rawDepartment = String(formData.get("department_id") ?? "");
  const departmentId = rawDepartment === "" ? null : rawDepartment;
  const role = String(formData.get("role") ?? "") as UserRole;
  const jobGrade = String(formData.get("job_grade") ?? "") as JobGrade;
  const rawManager = String(formData.get("manager_id") ?? "");
  const managerId = rawManager === "" ? null : rawManager;

  if (!name) return { error: "氏名を入力してください。", success: false };
  if (!ROLES.includes(role)) return { error: "権限の値が不正です。", success: false };
  if (!JOB_GRADES.includes(jobGrade)) return { error: "役職の値が不正です。", success: false };

  const supabase = await createClient();
  const [{ data: everyone }, { data: departments }] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("departments").select("*"),
  ]);
  const profiles = everyone ?? [];
  if (departmentId && !departments?.some((d) => d.id === departmentId)) {
    return { error: "指定された部署が見つかりません。", success: false };
  }
  if (!profiles.some((p) => p.id === id)) {
    return { error: "対象の社員が見つかりません。", success: false };
  }

  const loop = managerId ? findLoop(profiles, id, managerId) : null;
  if (loop) return { error: loop, success: false };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name,
      department_id: departmentId,
      // 旧 text 列も同時に更新して、id と名前が食い違わないようにしておく
      // （0006 のコメントどおり、この列は次期に落とす）。
      department: departments?.find((d) => d.id === departmentId)?.name ?? null,
      role,
      job_grade: jobGrade,
      manager_id: managerId,
    })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    return { error: error?.message ?? "更新に失敗しました。", success: false };
  }

  revalidatePath("/admin/members");
  revalidatePath("/team");
  return { error: null, success: true };
}

/**
 * A cycle in the reporting line would make `is_second_approver_of` resolve to
 * the person themselves, so someone could approve their own evaluation. Walk
 * the proposed chain upwards before saving.
 */
function findLoop(profiles: Profile[], subjectId: string, managerId: string): string | null {
  if (managerId === subjectId) return "自分自身を上長に設定することはできません。";

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const seen = new Set<string>([subjectId]);
  let current: string | null = managerId;

  while (current) {
    if (seen.has(current)) {
      return "上長の設定が循環しています。組織図をたどれる形にしてください。";
    }
    seen.add(current);
    current = byId.get(current)?.manager_id ?? null;
  }
  return null;
}

/**
 * Open a new evaluation period. The dates are derived rather than typed in:
 * halves run Jan-Jun and Jul-Dec to line up with the July and December bonus
 * months of 賃金規定 第29条, and a hand-typed range could silently break that.
 */
export async function createPeriod(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます。", success: false };

  const year = Number(formData.get("year"));
  const half = String(formData.get("half") ?? "");

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "年度の値が不正です。", success: false };
  }
  if (half !== "H1" && half !== "H2") {
    return { error: "上期・下期を選択してください。", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("evaluation_periods").insert({
    year,
    half,
    starts_on: half === "H1" ? `${year}-01-01` : `${year}-07-01`,
    ends_on: half === "H1" ? `${year}-06-30` : `${year}-12-31`,
    status: "open",
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "その期は既に登録されています。"
          : "評価期間の登録に失敗しました。",
      success: false,
    };
  }

  revalidatePath("/admin/periods");
  revalidatePath("/evaluations/term");
  return { error: null, success: true };
}

/** Close a period so no new sheets are started against it, or reopen it. */
export async function setPeriodStatus(_prev: AdminState, formData: FormData): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます。", success: false };

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "open" && status !== "closed") {
    return { error: "不正な操作です。", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_periods")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) return { error: "更新に失敗しました。", success: false };

  revalidatePath("/admin/periods");
  return { error: null, success: true };
}

// ---------------------------------------------------------------------------
// 部署マスタ
//
// 部門目標の持ち主であり、部下がどの部門目標を選べるかを決める入れ子構造の
// 出どころ。役職や上長と同じく、ここを触れるのは管理者だけ。

export async function saveDepartment(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます。", success: false };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const rawParent = String(formData.get("parent_id") ?? "");
  const parentId = rawParent === "" ? null : rawParent;
  const rawHead = String(formData.get("head_id") ?? "");
  const headId = rawHead === "" ? null : rawHead;

  if (!name) return { error: "部署名を入力してください。", success: false };
  if (id && parentId === id) {
    return { error: "自分自身を上位部署にはできません。", success: false };
  }

  const supabase = await createClient();
  const { data: departments } = await supabase.from("departments").select("*");
  const all = departments ?? [];

  // 部署の親子が輪になると、部門目標を書ける範囲を決める上向きの探索が
  // 止まらなくなる。ポリシー側にも循環対策は入れてあるが、そもそも
  // 作らせないほうがよい。
  if (id && parentId) {
    const seen = new Set<string>([id]);
    let cursor: string | null = parentId;
    while (cursor) {
      if (seen.has(cursor)) {
        return { error: "部署の親子関係が循環します。", success: false };
      }
      seen.add(cursor);
      cursor = all.find((d) => d.id === cursor)?.parent_id ?? null;
    }
  }

  const patch = { name, parent_id: parentId, head_id: headId };

  if (id) {
    const { data, error } = await supabase
      .from("departments")
      .update(patch)
      .eq("id", id)
      .select("id");
    if (error || !data?.length) {
      return { error: error?.message ?? "更新に失敗しました。", success: false };
    }
  } else {
    const { data, error } = await supabase
      .from("departments")
      .insert({ ...patch, sort_order: (all.length + 1) * 10 })
      .select("id");
    if (error || !data?.length) {
      return { error: error?.message ?? "追加に失敗しました。", success: false };
    }
  }

  revalidatePath("/admin/departments");
  revalidatePath("/team/department-goals");
  return { error: null, success: true };
}

// ---------------------------------------------------------------------------
// 会社休日
//
// 登録された日は全社員の稼働日から外れ、日報の分母にも入らなくなる。

export async function addCompanyHoliday(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます。", success: false };

  const holidayOn = String(formData.get("holiday_on") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayOn)) {
    return { error: "日付を選択してください。", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_holidays")
    .upsert({ holiday_on: holidayOn, label }, { onConflict: "holiday_on" })
    .select("holiday_on");

  if (error || !data?.length) {
    return { error: error?.message ?? "登録に失敗しました。", success: false };
  }

  revalidatePath("/admin/holidays");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function deleteCompanyHoliday(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます。", success: false };

  const holidayOn = String(formData.get("holiday_on") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_holidays")
    .delete()
    .eq("holiday_on", holidayOn)
    .select("holiday_on");

  if (error || !data?.length) return { error: "削除に失敗しました。", success: false };

  revalidatePath("/admin/holidays");
  revalidatePath("/");
  return { error: null, success: true };
}
