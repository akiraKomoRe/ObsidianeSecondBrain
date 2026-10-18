import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { JOB_GRADE_WEIGHTS, calculateTermScore, type EvaluationItem } from "./score";
import type {
  EvaluationPeriod,
  JobGrade,
  TermEvaluation,
  TermEvaluationItem,
  TermEvaluationMark,
} from "@/types/database";

/** A goal with the manager's marks attached where the viewer may see them. */
export type TermItemWithMark = TermEvaluationItem & {
  mark: TermEvaluationMark | null;
};

export type TermEvaluationView = {
  evaluation: TermEvaluation;
  period: EvaluationPeriod;
  items: TermItemWithMark[];
  /** Whether the manager's marks are visible to this viewer at all. */
  marksVisible: boolean;
};

function toScoreItems(items: TermItemWithMark[]): EvaluationItem[] {
  return items.map((item) => ({
    category: item.category,
    selfScore: item.self_score,
    managerScore: item.mark?.manager_score ?? null,
    finalScore: item.mark?.final_score ?? null,
  }));
}

export function weightsFor(jobGrade: JobGrade) {
  return JOB_GRADE_WEIGHTS[jobGrade];
}

/** Convenience: score a loaded view without re-deriving the weights each time. */
export function scoreView(view: TermEvaluationView, column: "self" | "manager" | "final") {
  return calculateTermScore(toScoreItems(view.items), weightsFor(view.evaluation.job_grade), column);
}

/**
 * Load one evaluation with its goals.
 *
 * The marks query is issued unconditionally and simply comes back empty when
 * the viewer is not entitled to see it -- the RLS policy on
 * term_evaluation_marks is what enforces the pre-disclosure blackout, so this
 * function does not re-implement that check. Doing it here as well would risk
 * the two drifting apart, and the database is the one that has to be right.
 */
export async function getTermEvaluation(evaluationId: string): Promise<TermEvaluationView> {
  const supabase = await createClient();

  const { data: evaluation } = await supabase
    .from("term_evaluations")
    .select("*")
    .eq("id", evaluationId)
    .maybeSingle();

  if (!evaluation) notFound();

  const [{ data: period }, { data: items }, { data: marks }] = await Promise.all([
    supabase.from("evaluation_periods").select("*").eq("id", evaluation.period_id).maybeSingle(),
    supabase
      .from("term_evaluation_items")
      .select("*")
      .eq("term_evaluation_id", evaluationId)
      .order("category")
      .order("sort_order"),
    supabase.from("term_evaluation_marks").select("*").eq("term_evaluation_id", evaluationId),
  ]);

  if (!period) notFound();

  const markByItem = new Map((marks ?? []).map((mark) => [mark.item_id, mark]));

  return {
    evaluation,
    period,
    items: (items ?? []).map((item) => ({ ...item, mark: markByItem.get(item.id) ?? null })),
    marksVisible: (marks ?? []).length > 0,
  };
}

/** The employee's own evaluation for a period, if one exists yet. */
export async function getOwnTermEvaluation(
  userId: string,
  periodId: string
): Promise<TermEvaluationView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("term_evaluations")
    .select("id")
    .eq("user_id", userId)
    .eq("period_id", periodId)
    .maybeSingle();

  return data ? getTermEvaluation(data.id) : null;
}

/**
 * The period that `on` falls in. Halves run Jan-Jun and Jul-Dec, matching the
 * bonus months in 賃金規定 第29条.
 */
export async function getCurrentPeriod(on = new Date()): Promise<EvaluationPeriod | null> {
  const supabase = await createClient();
  const iso = on.toISOString().slice(0, 10);
  const { data } = await supabase
    .from("evaluation_periods")
    .select("*")
    .lte("starts_on", iso)
    .gte("ends_on", iso)
    .maybeSingle();
  return data ?? null;
}

export async function listPeriods(): Promise<EvaluationPeriod[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluation_periods")
    .select("*")
    .order("year", { ascending: false })
    .order("half", { ascending: false });
  return data ?? [];
}

export function formatPeriodLabel(period: EvaluationPeriod): string {
  return `${period.year}年 ${period.half === "H1" ? "上期（1-6月）" : "下期（7-12月）"}`;
}
