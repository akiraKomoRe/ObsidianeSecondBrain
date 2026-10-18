"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { getTermEvaluation, scoreView } from "@/lib/evaluation/get-term";
import {
  isDenied,
  relationTo,
  requireManagerDraft,
  requireSecondApprover,
} from "@/lib/evaluation/authz";

export type TermManagerState = { error: string | null; success: boolean };

function parseScore(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
}

/**
 * Save the manager's marks. Written to term_evaluation_marks, which the
 * employee cannot read until disclosure -- so this is safe to call repeatedly
 * while the manager is still making up their mind.
 */
export async function saveManagerMarks(
  _prev: TermManagerState,
  formData: FormData
): Promise<TermManagerState> {
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const itemIds = formData.getAll("item_id").map(String);

  // requireManagerDraft also refuses once the evaluation is approved: those
  // figures feed the bonus (人事評価規程 第10条) and the employee may dispute
  // them (第12条), so they must not move after sign-off.
  const allowed = await requireManagerDraft(evaluationId);
  if (isDenied(allowed)) return { error: allowed.error, success: false };

  const supabase = await createClient();

  for (const itemId of itemIds) {
    const managerScore = parseScore(formData.get(`manager_score_${itemId}`));
    const { data, error } = await supabase
      .from("term_evaluation_marks")
      .upsert(
        {
          item_id: itemId,
          term_evaluation_id: evaluationId,
          manager_score: managerScore,
          manager_comment: String(formData.get(`manager_comment_${itemId}`) ?? "").trim(),
          // The final score defaults to the manager's, and is only overridden if
          // the second approver adjusts it.
          final_score: managerScore,
        },
        { onConflict: "item_id" }
      )
      .select("item_id");
    if (error || !data?.length) return { error: "保存に失敗しました。", success: false };
  }

  const { data, error } = await supabase
    .from("term_evaluations")
    .update({
      overall_manager_comment: String(formData.get("overall_manager_comment") ?? "").trim(),
    })
    .eq("id", evaluationId)
    .select("id");

  if (error || !data?.length) return { error: "保存に失敗しました。", success: false };

  revalidatePath("/team");
  return { error: null, success: true };
}

/** Send the completed sheet to the second approver. */
export async function submitForApproval(
  _prev: TermManagerState,
  formData: FormData
): Promise<TermManagerState> {
  const evaluationId = String(formData.get("evaluation_id") ?? "");

  const allowed = await requireManagerDraft(evaluationId);
  if (isDenied(allowed)) return { error: allowed.error, success: false };
  if (allowed.evaluation.status === "pending_approval") {
    return { error: "既に承認依頼済みです。", success: false };
  }

  const view = await getTermEvaluation(evaluationId);
  const ungraded = view.items.filter((item) => item.mark?.manager_score == null);
  if (ungraded.length > 0) {
    return {
      error: `未採点の項目が${ungraded.length}件あります。すべて評価してから承認依頼してください。`,
      success: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("term_evaluations")
    .update({ status: "pending_approval", submitted_for_approval_at: new Date().toISOString() })
    .eq("id", evaluationId)
    .select("id");

  if (error || !data?.length) return { error: "承認依頼に失敗しました。", success: false };

  revalidatePath("/team");
  revalidatePath("/approvals");
  return { error: null, success: true };
}

/**
 * Second approver signs off. The computed totals are frozen into
 * final_snapshot here: 人事評価規程 第10条 ties these numbers to bonus and
 * promotion, and 第12条 lets employees dispute them, so the figures must not
 * move afterwards even if weights or goals are edited later.
 */
export async function approveTermEvaluation(
  _prev: TermManagerState,
  formData: FormData
): Promise<TermManagerState> {
  const evaluationId = String(formData.get("evaluation_id") ?? "");

  const allowed = await requireSecondApprover(evaluationId);
  if (isDenied(allowed)) return { error: allowed.error, success: false };
  if (allowed.evaluation.status !== "pending_approval") {
    return { error: "承認待ちの評価ではありません。", success: false };
  }

  const approver = await getCurrentProfile();
  const view = await getTermEvaluation(evaluationId);
  const finalScore = scoreView(view, "final");
  const selfScore = scoreView(view, "self");
  const approvedAt = new Date().toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("term_evaluations")
    .update({
      status: "approved",
      approver_id: approver.id,
      approved_at: approvedAt,
      final_snapshot: {
        job_grade: view.evaluation.job_grade,
        final_total: finalScore.total,
        self_total: selfScore.total,
        categories: finalScore.categories,
        items: view.items.map((item) => ({
          id: item.id,
          category: item.category,
          title: item.title,
          self_score: item.self_score,
          manager_score: item.mark?.manager_score ?? null,
          final_score: item.mark?.final_score ?? null,
        })),
        approved_by: approver.id,
        approved_at: approvedAt,
      },
    })
    .eq("id", evaluationId)
    .select("id");

  if (error || !data?.length) return { error: "承認に失敗しました。", success: false };

  revalidatePath("/team");
  revalidatePath("/approvals");
  return { error: null, success: true };
}

/** Send it back to the manager for rework. */
export async function rejectTermEvaluation(
  _prev: TermManagerState,
  formData: FormData
): Promise<TermManagerState> {
  const evaluationId = String(formData.get("evaluation_id") ?? "");

  const allowed = await requireSecondApprover(evaluationId);
  if (isDenied(allowed)) return { error: allowed.error, success: false };
  if (allowed.evaluation.status !== "pending_approval") {
    return { error: "承認待ちの評価ではありません。", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("term_evaluations")
    .update({ status: "draft", submitted_for_approval_at: null })
    .eq("id", evaluationId)
    .select("id");

  if (error || !data?.length) return { error: "差し戻しに失敗しました。", success: false };

  revalidatePath("/team");
  revalidatePath("/approvals");
  return { error: null, success: true };
}

/**
 * Release the result to the employee, after the feedback meeting.
 *
 * This is the switch the whole term_evaluation_marks split exists to serve:
 * until disclosed_at is set, RLS hides the manager's marks from the employee
 * entirely. Deliberately a separate action from approval so that the manager
 * controls when the conversation happens.
 */
export async function discloseTermEvaluation(
  _prev: TermManagerState,
  formData: FormData
): Promise<TermManagerState> {
  const evaluationId = String(formData.get("evaluation_id") ?? "");

  // Not requireManagerDraft: by definition this runs on an approved sheet.
  const view = await getTermEvaluation(evaluationId);
  const relation = await relationTo(view.evaluation.user_id);
  if (relation !== "manager" && relation !== "admin") {
    return { error: "この評価を公開する権限がありません。", success: false };
  }
  if (view.evaluation.status !== "approved") {
    return { error: "承認が完了してから公開してください。", success: false };
  }
  if (view.evaluation.disclosed_at) {
    return { error: "既に公開済みです。", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("term_evaluations")
    .update({ disclosed_at: new Date().toISOString() })
    .eq("id", evaluationId)
    .select("id");

  if (error || !data?.length) return { error: "公開に失敗しました。", success: false };

  revalidatePath("/team");
  revalidatePath("/evaluations/term");
  return { error: null, success: true };
}
