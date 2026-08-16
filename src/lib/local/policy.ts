import type { LocalTables, Row, TableName } from "./tables.ts";

/**
 * The RLS policies of `supabase/migrations/0001..0003` re-expressed in
 * TypeScript, for the local (no-database) mode.
 *
 * This file is not a convenience. `src/lib/evaluation/get-term.ts` documents
 * that it deliberately does NOT re-check who may read the manager's marks,
 * because the database policy is the thing that has to be right. Take the
 * database away and that guarantee has to live somewhere -- it lives here.
 * `policy.test.ts` asserts the same matrix as
 * `supabase/tests/01_term_evaluation_rls.sql`.
 *
 * `viewer === null` means the service role (createAdminClient), which bypasses
 * RLS in Postgres and bypasses this too.
 */

export type Viewer = { id: string } | null;

type Ctx = { tables: LocalTables; viewerId: string };

function profileOf(ctx: Ctx, userId: string) {
  return ctx.tables.profiles.find((p) => p.id === userId) ?? null;
}

/** is_manager_of(): the viewer is the direct manager of target. */
function isManagerOf(ctx: Ctx, targetUserId: string): boolean {
  return profileOf(ctx, targetUserId)?.manager_id === ctx.viewerId;
}

/** is_second_approver_of(): the viewer is the manager's manager of target. */
function isSecondApproverOf(ctx: Ctx, targetUserId: string): boolean {
  const managerId = profileOf(ctx, targetUserId)?.manager_id;
  if (!managerId) return false;
  return profileOf(ctx, managerId)?.manager_id === ctx.viewerId;
}

/** is_admin(): the viewer's own role is admin. */
function isAdmin(ctx: Ctx): boolean {
  return profileOf(ctx, ctx.viewerId)?.role === "admin";
}

/** Anyone in the org chart above the subject, plus admins. */
function isOversightOf(ctx: Ctx, targetUserId: string): boolean {
  return isManagerOf(ctx, targetUserId) || isSecondApproverOf(ctx, targetUserId) || isAdmin(ctx);
}

function evaluationOf(ctx: Ctx, termEvaluationId: unknown) {
  return ctx.tables.term_evaluations.find((e) => e.id === termEvaluationId) ?? null;
}

type Rules = {
  select: (row: Row, ctx: Ctx) => boolean;
  /** Omitted means "same as select". */
  write?: (row: Row, ctx: Ctx) => boolean;
};

const OWN_OR_OVERSIGHT: Rules = {
  select: (row, ctx) =>
    row.user_id === ctx.viewerId || isOversightOf(ctx, String(row.user_id)),
  write: (row, ctx) => row.user_id === ctx.viewerId,
};

/** Masters every signed-in user may read; only the service role writes them. */
const READ_ONLY_MASTER: Rules = { select: () => true, write: () => false };

const RULES: Record<TableName, Rules> = {
  // A person sees their own profile and anyone they oversee. Managers also
  // need the whole roster to pick a manager, which admin covers; ordinary
  // employees do not get the roster.
  profiles: {
    select: (row, ctx) =>
      row.id === ctx.viewerId || isOversightOf(ctx, String(row.id)) || isAdmin(ctx),
    write: (row, ctx) => row.id === ctx.viewerId || isAdmin(ctx),
  },
  daily_reports: OWN_OR_OVERSIGHT,
  weekly_reports: OWN_OR_OVERSIGHT,
  weekly_ai_evaluations: { ...OWN_OR_OVERSIGHT, write: () => false },
  evaluation_criteria: READ_ONLY_MASTER,
  job_grade_weights: READ_ONLY_MASTER,
  behavior_guidelines: READ_ONLY_MASTER,
  evaluation_periods: { select: () => true, write: (_row, ctx) => isAdmin(ctx) },

  // 会社休日は秘密ではない -- 今日日報を出す義務があるかを全員が知る必要がある。
  // 編集は総務（admin）だけ。
  company_holidays: { select: () => true, write: (_row, ctx) => isAdmin(ctx) },

  // 休暇は個人情報。誰がいつ何で休んだかは同僚どうしで横に見えてはいけないので、
  // 評価本体と同じ三者（本人・上長・管理者）だけが読める。
  personal_leaves: {
    select: (row, ctx) =>
      row.user_id === ctx.viewerId || isOversightOf(ctx, String(row.user_id)),
    write: (_row, ctx) => isAdmin(ctx),
  },

  term_evaluations: {
    select: (row, ctx) =>
      row.user_id === ctx.viewerId || isOversightOf(ctx, String(row.user_id)),
    // The employee may edit their own sheet only while it is still a draft;
    // once it goes for approval it is frozen to them. Managers and the second
    // approver keep write access (they are the ones moving it forward).
    write: (row, ctx) =>
      (row.user_id === ctx.viewerId && row.status === "draft") ||
      isOversightOf(ctx, String(row.user_id)),
  },

  term_evaluation_items: {
    select: (row, ctx) => {
      const evaluation = evaluationOf(ctx, row.term_evaluation_id);
      if (!evaluation) return false;
      return evaluation.user_id === ctx.viewerId || isOversightOf(ctx, evaluation.user_id);
    },
    write: (row, ctx) => {
      const evaluation = evaluationOf(ctx, row.term_evaluation_id);
      if (!evaluation) return false;
      return evaluation.user_id === ctx.viewerId && evaluation.status === "draft";
    },
  },

  // The whole reason this table exists separately. Postgres policies gate
  // rows, not columns, so the manager's marks were split out of
  // term_evaluation_items in order to be hidden row-and-all until disclosure.
  term_evaluation_marks: {
    select: (row, ctx) => {
      const evaluation = evaluationOf(ctx, row.term_evaluation_id);
      if (!evaluation) return false;
      if (isOversightOf(ctx, evaluation.user_id)) return true;
      return evaluation.user_id === ctx.viewerId && evaluation.disclosed_at !== null;
    },
    // The subject can never write their own marks, disclosed or not.
    write: (row, ctx) => {
      const evaluation = evaluationOf(ctx, row.term_evaluation_id);
      return evaluation ? isOversightOf(ctx, evaluation.user_id) : false;
    },
  },
};

export function canSelect(table: TableName, row: Row, tables: LocalTables, viewer: Viewer): boolean {
  if (viewer === null) return true; // service role
  return RULES[table].select(row, { tables, viewerId: viewer.id });
}

export function canWrite(table: TableName, row: Row, tables: LocalTables, viewer: Viewer): boolean {
  if (viewer === null) return true; // service role
  const ctx = { tables, viewerId: viewer.id };
  const rules = RULES[table];
  return (rules.write ?? rules.select)(row, ctx);
}

/**
 * Columns a non-admin may never change, even on their own row.
 *
 * `role` decides what they can see, `job_grade` decides how their points are
 * weighted, and `manager_id` decides who evaluates them. Policies gate rows,
 * not columns, so in Postgres this is a BEFORE UPDATE trigger
 * (`profiles_guard_privileged_columns`, migration 0004). This is that trigger.
 */
const PRIVILEGED_COLUMNS: Partial<Record<TableName, string[]>> = {
  profiles: ["role", "job_grade", "manager_id"],
};

/** Returns the offending column, or null when the update is allowed. */
export function blockedColumn(
  table: TableName,
  before: Row,
  after: Row,
  tables: LocalTables,
  viewer: Viewer
): string | null {
  if (viewer === null) return null; // service role
  const guarded = PRIVILEGED_COLUMNS[table];
  if (!guarded || isAdmin({ tables, viewerId: viewer.id })) return null;
  return guarded.find((column) => column in after && after[column] !== before[column]) ?? null;
}

export const policyHelpers = { isManagerOf, isSecondApproverOf, isAdmin, isOversightOf };
