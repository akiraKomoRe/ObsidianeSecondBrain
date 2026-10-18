// Hand-written types for the Phase 1 schema (see supabase/migrations/0001_init.sql).
// If the schema changes, update these alongside the migration.

export type UserRole = "employee" | "manager" | "admin";

export type Profile = {
  id: string;
  email: string;
  name: string;
  /** Permission level. Distinct from job_grade, which drives scoring weights. */
  role: UserRole;
  /** Added in 0003. Decides the term-evaluation category weights. */
  job_grade: JobGrade;
  /** Legacy free-text name. Kept in sync with department_id; drops next term. */
  department: string | null;
  /** Added in 0006. The department master row this person belongs to. */
  department_id: string | null;
  manager_id: string | null;
  created_at: string;
};

// --- Departments, see supabase/migrations/0006_department_goals.sql ---

/**
 * 部署マスタ。`parent_id` で入れ子になるのは、工事第一課 が 工事本部 の下に
 * あるような構造を持つ必要があるから -- 課の社員は本部の目標も選べる。
 */
export type Department = {
  id: string;
  name: string;
  parent_id: string | null;
  /** その部署の長。部門目標を書けるのはこの人（と管理者）だけ。 */
  head_id: string | null;
  sort_order: number;
  created_at: string;
};

/** 部長が期ごとに定める部門目標。個人の部門定量項目の紐付け先。 */
export type DepartmentGoal = {
  id: string;
  department_id: string;
  period_id: string;
  sort_order: number;
  title: string;
  description: string;
  /** 「事故0件」「原価率◯%」など、何をもって達成とするか。 */
  target_metric: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyReport = {
  id: string;
  user_id: string;
  report_date: string; // YYYY-MM-DD
  work_content: string;
  work_hours: number | null;
  issues: string | null;
  tomorrow_plan: string | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyReport = {
  id: string;
  user_id: string;
  week_start: string; // YYYY-MM-DD (Monday)
  week_end: string; // YYYY-MM-DD (Sunday)
  self_reflection: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EvaluationCriterion = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string | null;
  weight: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type CriterionScore = {
  key: string;
  label: string;
  score: number; // 1-5
  comment: string;
};

export type WeeklyAiEvaluation = {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  criteria_scores: CriterionScore[];
  overall_summary: string | null;
  model_version: string | null;
  /** Added in 0005. Which version of the prompt/rules produced these scores. */
  prompt_version: string | null;
  generated_at: string;
};

// --- Attendance, see supabase/migrations/0005_prompt_version_and_attendance.sql ---

/** 全社共通の休業日（祝日・年末年始・創立記念日など）。 */
export type CompanyHoliday = {
  holiday_on: string; // YYYY-MM-DD
  label: string;
  created_at: string;
};

/**
 * 個人の休暇。行が存在する日は稼働日から外れる（＝日報の提出対象外）。
 * `kind` は表示のためだけで、稼働日判定は種別を見ない。
 */
export type PersonalLeave = {
  user_id: string;
  leave_on: string; // YYYY-MM-DD
  kind: string;
  /** 'manual' か、同期元の名前（ジョブカン連携後は 'jobcan'）。 */
  source: string;
  created_at: string;
};

// --- Term (半期) evaluation, see supabase/migrations/0003_term_evaluation.sql ---

/** Job grade decides scoring weights, separately from the permission role. */
export type JobGrade = "director" | "bucho" | "kacho" | "kakaricho" | "shunin" | "ippan";

/** The three categories of 人事評価規程 第5条. */
export type EvaluationCategory = "quantitative" | "behavioral" | "development";

export type EvaluationPeriod = {
  id: string;
  year: number;
  half: "H1" | "H2";
  starts_on: string;
  ends_on: string;
  status: "open" | "closed";
  created_at: string;
};

export type JobGradeWeights = {
  job_grade: JobGrade;
  quantitative: number;
  behavioral: number;
  development: number;
};

export type BehaviorGuideline = {
  id: string;
  sort_order: number;
  title: string;
  job_grade: JobGrade;
  expected_behavior: string;
};

export type TermEvaluationStage = "goal_setting" | "midterm" | "final";
export type TermEvaluationStatus = "draft" | "pending_approval" | "approved";

export type TermEvaluation = {
  id: string;
  user_id: string;
  period_id: string;
  stage: TermEvaluationStage;
  status: TermEvaluationStatus;
  job_grade: JobGrade;
  overall_self_comment: string | null;
  overall_manager_comment: string | null;
  submitted_for_approval_at: string | null;
  approver_id: string | null;
  approved_at: string | null;
  /** Set when the manager releases results to the employee after the meeting. */
  disclosed_at: string | null;
  final_snapshot: unknown | null;
  created_at: string;
  updated_at: string;
};

/** A goal plus the employee's own inputs. Readable by the employee at any time. */
export type TermEvaluationItem = {
  id: string;
  term_evaluation_id: string;
  category: EvaluationCategory;
  sort_order: number;
  title: string;
  /**
   * Added in 0006. Which 部門目標 this personal goal serves.
   * Null for behavioral/development rows (a CHECK enforces that), and null on
   * quantitative rows in a term where no department goals were set.
   */
  department_goal_id: string | null;
  expected_behavior: string | null;
  midterm_progress: string | null;
  midterm_self_score: number | null;
  self_comment: string | null;
  self_score: number | null;
  created_at: string;
  updated_at: string;
};

/**
 * The manager's marks. A separate table so RLS can hide them entirely until
 * `term_evaluations.disclosed_at` is set -- policies gate rows, not columns.
 */
export type TermEvaluationMark = {
  item_id: string;
  term_evaluation_id: string;
  manager_comment: string | null;
  manager_score: number | null;
  final_score: number | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      daily_reports: {
        Row: DailyReport;
        Insert: Partial<DailyReport>;
        Update: Partial<DailyReport>;
        Relationships: [];
      };
      weekly_reports: {
        Row: WeeklyReport;
        Insert: Partial<WeeklyReport>;
        Update: Partial<WeeklyReport>;
        Relationships: [];
      };
      evaluation_criteria: {
        Row: EvaluationCriterion;
        Insert: Partial<EvaluationCriterion>;
        Update: Partial<EvaluationCriterion>;
        Relationships: [];
      };
      weekly_ai_evaluations: {
        Row: WeeklyAiEvaluation;
        Insert: Partial<WeeklyAiEvaluation>;
        Update: Partial<WeeklyAiEvaluation>;
        Relationships: [];
      };
      evaluation_periods: {
        Row: EvaluationPeriod;
        Insert: Partial<EvaluationPeriod>;
        Update: Partial<EvaluationPeriod>;
        Relationships: [];
      };
      departments: {
        Row: Department;
        Insert: Partial<Department>;
        Update: Partial<Department>;
        Relationships: [];
      };
      department_goals: {
        Row: DepartmentGoal;
        Insert: Partial<DepartmentGoal>;
        Update: Partial<DepartmentGoal>;
        Relationships: [];
      };
      company_holidays: {
        Row: CompanyHoliday;
        Insert: Partial<CompanyHoliday>;
        Update: Partial<CompanyHoliday>;
        Relationships: [];
      };
      personal_leaves: {
        Row: PersonalLeave;
        Insert: Partial<PersonalLeave>;
        Update: Partial<PersonalLeave>;
        Relationships: [];
      };
      job_grade_weights: {
        Row: JobGradeWeights;
        Insert: Partial<JobGradeWeights>;
        Update: Partial<JobGradeWeights>;
        Relationships: [];
      };
      behavior_guidelines: {
        Row: BehaviorGuideline;
        Insert: Partial<BehaviorGuideline>;
        Update: Partial<BehaviorGuideline>;
        Relationships: [];
      };
      term_evaluations: {
        Row: TermEvaluation;
        Insert: Partial<TermEvaluation>;
        Update: Partial<TermEvaluation>;
        Relationships: [];
      };
      term_evaluation_items: {
        Row: TermEvaluationItem;
        Insert: Partial<TermEvaluationItem>;
        Update: Partial<TermEvaluationItem>;
        Relationships: [];
      };
      term_evaluation_marks: {
        Row: TermEvaluationMark;
        Insert: Partial<TermEvaluationMark>;
        Update: Partial<TermEvaluationMark>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
