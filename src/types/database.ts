// Hand-written types for the Phase 1 schema (see supabase/migrations/0001_init.sql).
// If the schema changes, update these alongside the migration.

export type UserRole = "employee" | "manager" | "admin";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string | null;
  manager_id: string | null;
  created_at: string;
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
  generated_at: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
