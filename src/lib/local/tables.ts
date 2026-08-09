import type {
  BehaviorGuideline,
  DailyReport,
  EvaluationCriterion,
  EvaluationPeriod,
  JobGradeWeights,
  Profile,
  TermEvaluation,
  TermEvaluationItem,
  TermEvaluationMark,
  WeeklyAiEvaluation,
  WeeklyReport,
} from "@/types/database";

/**
 * The shape of the local JSON store: one array per table in
 * `supabase/migrations/*`, using the same row types the Supabase client is
 * typed with. Keeping the names identical to the SQL tables is what lets the
 * local client stand in for `supabase.from("...")` without touching callers.
 */
export type LocalTables = {
  profiles: Profile[];
  daily_reports: DailyReport[];
  weekly_reports: WeeklyReport[];
  evaluation_criteria: EvaluationCriterion[];
  weekly_ai_evaluations: WeeklyAiEvaluation[];
  evaluation_periods: EvaluationPeriod[];
  job_grade_weights: JobGradeWeights[];
  behavior_guidelines: BehaviorGuideline[];
  term_evaluations: TermEvaluation[];
  term_evaluation_items: TermEvaluationItem[];
  term_evaluation_marks: TermEvaluationMark[];
};

export type TableName = keyof LocalTables;

export type Row = Record<string, unknown>;

/**
 * Primary keys, used by upsert/update to find the row to replace. Most tables
 * are keyed on `id`; the two exceptions mirror the SQL exactly --
 * term_evaluation_marks is keyed on item_id (one mark per goal) and
 * job_grade_weights on job_grade.
 */
export const PRIMARY_KEY: Record<TableName, string> = {
  profiles: "id",
  daily_reports: "id",
  weekly_reports: "id",
  evaluation_criteria: "id",
  weekly_ai_evaluations: "id",
  evaluation_periods: "id",
  job_grade_weights: "job_grade",
  behavior_guidelines: "id",
  term_evaluations: "id",
  term_evaluation_items: "id",
  term_evaluation_marks: "item_id",
};

/**
 * Unique constraints from the migrations. The local client uses these to
 * resolve `upsert(..., { onConflict })` and to reject duplicate inserts, so
 * that a second `createTermEvaluation` for the same period fails here the same
 * way Postgres would.
 */
export const UNIQUE_KEYS: Partial<Record<TableName, string[][]>> = {
  profiles: [["email"]],
  daily_reports: [["user_id", "report_date"]],
  weekly_reports: [["user_id", "week_start"]],
  evaluation_criteria: [["key"]],
  weekly_ai_evaluations: [["user_id", "week_start"]],
  evaluation_periods: [["year", "half"]],
  behavior_guidelines: [["sort_order", "job_grade"]],
  term_evaluations: [["user_id", "period_id"]],
};
