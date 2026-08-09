import "server-only";

import { getCurrentProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { TermEvaluation } from "@/types/database";

/**
 * Authorization checks for the term-evaluation actions.
 *
 * The row-level policies in `supabase/migrations/` are still the backstop, but
 * they are not sufficient on their own for two reasons:
 *
 *  - They cannot express rules that depend on WHICH row is being touched in a
 *    way the policy does not model. A policy lets the employee delete their
 *    own goals; it has no opinion on the fact that the five 行動指針 rows are
 *    company-wide and must not be deleted by anybody.
 *  - A write that a policy rejects comes back from PostgREST as a success with
 *    zero rows affected, not as an error. Without an explicit check the user
 *    is told "保存しました" while nothing was written.
 */

export type Relation = "self" | "manager" | "second_approver" | "admin" | "none";

/** How the signed-in user relates to `targetUserId` in the org chart. */
export async function relationTo(targetUserId: string): Promise<Relation> {
  const me = await getCurrentProfile();
  if (me.id === targetUserId) return "self";
  if (me.role === "admin") return "admin";

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!target) return "none";
  if (target.manager_id === me.id) return "manager";
  if (target.manager_id) {
    const { data: manager } = await supabase
      .from("profiles")
      .select("manager_id")
      .eq("id", target.manager_id)
      .maybeSingle();
    if (manager?.manager_id === me.id) return "second_approver";
  }
  return "none";
}

export async function loadEvaluation(evaluationId: string): Promise<TermEvaluation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("term_evaluations")
    .select("*")
    .eq("id", evaluationId)
    .maybeSingle();
  return data;
}

export type Denied = { error: string; success: false };
export type Allowed = { evaluation: TermEvaluation; relation: Relation };

function deny(message: string): Denied {
  return { error: message, success: false };
}

/**
 * The sheet is the caller's own and still editable. `pending_approval` and
 * `approved` are frozen to the employee -- the manager may already have read
 * what they submitted, and 人事評価規程 第10条 ties the numbers to bonuses.
 */
export async function requireOwnDraft(evaluationId: string): Promise<Allowed | Denied> {
  const evaluation = await loadEvaluation(evaluationId);
  if (!evaluation) return deny("対象の評価シートが見つかりません。");

  const relation = await relationTo(evaluation.user_id);
  if (relation !== "self") return deny("この評価シートを編集する権限がありません。");
  if (evaluation.status !== "draft") {
    return deny("承認依頼済みのため編集できません。差し戻しを上長に依頼してください。");
  }
  return { evaluation, relation };
}

/** The caller manages this person, and the sheet has not been submitted yet. */
export async function requireManagerDraft(evaluationId: string): Promise<Allowed | Denied> {
  const evaluation = await loadEvaluation(evaluationId);
  if (!evaluation) return deny("対象の評価シートが見つかりません。");

  const relation = await relationTo(evaluation.user_id);
  if (relation !== "manager" && relation !== "admin") {
    return deny("この評価を採点する権限がありません。");
  }
  if (evaluation.status === "approved") {
    return deny("承認済みの評価は変更できません。");
  }
  return { evaluation, relation };
}

/** The caller is the approver above this person's manager. */
export async function requireSecondApprover(evaluationId: string): Promise<Allowed | Denied> {
  const evaluation = await loadEvaluation(evaluationId);
  if (!evaluation) return deny("対象の評価シートが見つかりません。");

  const relation = await relationTo(evaluation.user_id);
  if (relation !== "second_approver" && relation !== "admin") {
    return deny("この評価を承認する権限がありません。");
  }
  return { evaluation, relation };
}

export function isDenied(result: Allowed | Denied): result is Denied {
  return "error" in result;
}
