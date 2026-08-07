"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import type { EvaluationCategory, TermEvaluationItem } from "@/types/database";

export type TermFormState = { error: string | null; success: boolean };

/**
 * Start a sheet for a period. Behavioral goals are seeded from
 * behavior_guidelines because those five are fixed company-wide; the
 * quantitative and development goals are left for the employee to write.
 */
export async function createTermEvaluation(
  _prev: TermFormState,
  formData: FormData
): Promise<TermFormState> {
  const periodId = String(formData.get("period_id") ?? "");
  if (!periodId) return { error: "対象期間が指定されていません。", success: false };

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("term_evaluations")
    .select("id")
    .eq("user_id", profile.id)
    .eq("period_id", periodId)
    .maybeSingle();
  if (existing) return { error: "この期の評価シートは既に作成されています。", success: false };

  const { data: created, error } = await supabase
    .from("term_evaluations")
    .insert({
      user_id: profile.id,
      period_id: periodId,
      // Snapshot the grade so a later promotion cannot reweight a past period.
      job_grade: profile.job_grade,
      stage: "goal_setting",
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "評価シートの作成に失敗しました。", success: false };
  }

  const { data: guidelines } = await supabase
    .from("behavior_guidelines")
    .select("*")
    .eq("job_grade", profile.job_grade)
    .order("sort_order");

  if (guidelines?.length) {
    await supabase.from("term_evaluation_items").insert(
      guidelines.map((guideline) => ({
        term_evaluation_id: created.id,
        category: "behavioral" as EvaluationCategory,
        sort_order: guideline.sort_order,
        title: guideline.title,
        expected_behavior: guideline.expected_behavior,
      }))
    );
  }

  revalidatePath("/evaluations/term");
  return { error: null, success: true };
}

/** Add an empty quantitative or development goal for the employee to fill in. */
export async function addTermItem(_prev: TermFormState, formData: FormData): Promise<TermFormState> {
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const category = String(formData.get("category") ?? "") as EvaluationCategory;

  if (category !== "quantitative" && category !== "development") {
    // Behavioral rows are seeded from the company-wide guidelines, never added.
    return { error: "この区分には目標を追加できません。", success: false };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("term_evaluation_items")
    .select("id", { count: "exact", head: true })
    .eq("term_evaluation_id", evaluationId)
    .eq("category", category);

  const { error } = await supabase.from("term_evaluation_items").insert({
    term_evaluation_id: evaluationId,
    category,
    sort_order: count ?? 0,
    title: "",
  });

  if (error) return { error: "目標の追加に失敗しました。", success: false };

  revalidatePath("/evaluations/term");
  return { error: null, success: true };
}

export async function deleteTermItem(_prev: TermFormState, formData: FormData): Promise<TermFormState> {
  const itemId = String(formData.get("item_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("term_evaluation_items").delete().eq("id", itemId);
  if (error) return { error: "目標の削除に失敗しました。", success: false };
  revalidatePath("/evaluations/term");
  return { error: null, success: true };
}

function parseScore(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
}

/**
 * Save the employee's side of the sheet. Which fields are written depends on
 * the stage, so that filling in the final self-assessment cannot silently wipe
 * the mid-period record that the manager may already have read.
 */
export async function saveOwnTermEvaluation(
  _prev: TermFormState,
  formData: FormData
): Promise<TermFormState> {
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const itemIds = formData.getAll("item_id").map(String);

  const supabase = await createClient();

  for (const itemId of itemIds) {
    const patch: Partial<TermEvaluationItem> =
      stage === "goal_setting"
        ? { title: String(formData.get(`title_${itemId}`) ?? "").trim() }
        : stage === "midterm"
          ? {
              midterm_progress: String(formData.get(`midterm_progress_${itemId}`) ?? "").trim(),
              midterm_self_score: parseScore(formData.get(`midterm_self_score_${itemId}`)),
            }
          : {
              self_comment: String(formData.get(`self_comment_${itemId}`) ?? "").trim(),
              self_score: parseScore(formData.get(`self_score_${itemId}`)),
            };

    const { error } = await supabase.from("term_evaluation_items").update(patch).eq("id", itemId);
    if (error) return { error: "保存に失敗しました。", success: false };
  }

  if (stage === "final") {
    const { error } = await supabase
      .from("term_evaluations")
      .update({ overall_self_comment: String(formData.get("overall_self_comment") ?? "").trim() })
      .eq("id", evaluationId);
    if (error) return { error: "保存に失敗しました。", success: false };
  }

  revalidatePath("/evaluations/term");
  return { error: null, success: true };
}

/** Move the sheet to the next stage. Goals -> midterm -> final. */
export async function advanceStage(_prev: TermFormState, formData: FormData): Promise<TermFormState> {
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const next = String(formData.get("next_stage") ?? "");

  if (next !== "midterm" && next !== "final") {
    return { error: "不正な操作です。", success: false };
  }

  const supabase = await createClient();

  if (next === "midterm") {
    // Goals must actually say something before the period starts being judged.
    const { data: items } = await supabase
      .from("term_evaluation_items")
      .select("title")
      .eq("term_evaluation_id", evaluationId);
    if ((items ?? []).some((item) => !item.title.trim())) {
      return { error: "未記入の目標があります。すべて入力してください。", success: false };
    }
  }

  const { error } = await supabase
    .from("term_evaluations")
    .update({ stage: next })
    .eq("id", evaluationId);

  if (error) return { error: "更新に失敗しました。", success: false };

  revalidatePath("/evaluations/term");
  return { error: null, success: true };
}
