-- Term (半期) evaluation: the end-of-period sheet that feeds bonus and
-- promotion decisions. Additive on top of 0001/0002 -- never edit those.
--
-- Modelled directly on the company's existing Excel sheet (新評価シート（原本）)
-- rather than on the weekly AI evaluation already in the app. The two are
-- different instruments: the weekly evaluation reads reports and scores fixed
-- criteria, whereas this sheet grades goals the employee sets at the start of
-- the period. Both are kept.
--
-- Rules this schema has to honour, from 人事評価規程 (2026-04-01 施行):
--   第5条  evaluation is exactly three categories -- see evaluation_category
--   第10条 results feed bonus and promotion, so finalized numbers must be
--          auditable and must not shift when masters are edited later
--   第12条 employees may formally dispute a result, which is only meaningful
--          if the basis can be reconstructed -- hence the frozen snapshot

-- ---------------------------------------------------------------------------
-- Job grade. Deliberately separate from profiles.role: role is a permission
-- level (employee/manager/admin), whereas job grade decides the scoring
-- weights. A 課長 and a 主任 can both be managers but are weighted differently.
create type public.job_grade as enum (
  'director',   -- 取締役
  'bucho',      -- 部長
  'kacho',      -- 課長
  'kakaricho',  -- 係長
  'shunin',     -- 主任
  'ippan'       -- 一般
);

alter table public.profiles
  add column if not exists job_grade public.job_grade not null default 'ippan';

-- ---------------------------------------------------------------------------
-- The three categories of 人事評価規程 第5条.
create type public.evaluation_category as enum (
  'quantitative', -- 部門定量項目
  'behavioral',   -- 行動指針項目
  'development'   -- 育成・支援・管理・自己研鑽項目
);

-- Weights per job grade, mirroring the 役職別評価ウェイト sheet. Each row must
-- sum to 1.0 so a fully-marked sheet totals exactly 100 points.
create table if not exists public.job_grade_weights (
  job_grade public.job_grade primary key,
  quantitative numeric(3, 2) not null,
  behavioral numeric(3, 2) not null,
  development numeric(3, 2) not null,
  constraint job_grade_weights_sum_to_one
    check (quantitative + behavioral + development = 1.0)
);

insert into public.job_grade_weights (job_grade, quantitative, behavioral, development) values
  ('director',  0.00, 0.50, 0.50),
  ('bucho',     0.50, 0.10, 0.40),
  ('kacho',     0.40, 0.30, 0.30),
  ('kakaricho', 0.30, 0.50, 0.20),
  ('shunin',    0.20, 0.70, 0.10),
  ('ippan',     0.10, 0.80, 0.10)
on conflict (job_grade) do nothing;

-- The five company-wide 行動指針, with the expected behaviour spelled out per
-- job grade. These are fixed for everyone; only the wording varies by grade.
create table if not exists public.behavior_guidelines (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null,
  title text not null,
  job_grade public.job_grade not null,
  expected_behavior text not null,
  unique (sort_order, job_grade)
);

-- ---------------------------------------------------------------------------
-- Evaluation periods. Halves run Jan-Jun and Jul-Dec, matching both the sample
-- sheet (対象期間 2026年1月～2026年6月) and the bonus months in 賃金規定 第29条
-- (July and December).
create table if not exists public.evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  half text not null check (half in ('H1', 'H2')),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  unique (year, half),
  constraint evaluation_periods_range check (ends_on > starts_on)
);

-- ---------------------------------------------------------------------------
-- One evaluation per employee per period.
create table if not exists public.term_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_id uuid not null references public.evaluation_periods (id) on delete cascade,

  -- Where the sheet is in its lifecycle: goals set, mid-period check-in, final.
  stage text not null default 'goal_setting'
    check (stage in ('goal_setting', 'midterm', 'final')),

  -- Approval state. 二段階承認: the manager submits, a second approver signs off.
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved')),

  -- Grade at the time of evaluation. Copied rather than joined so that a later
  -- promotion does not retroactively reweight a closed evaluation (第10条).
  job_grade public.job_grade not null,

  overall_self_comment text default '',
  overall_manager_comment text default '',

  submitted_for_approval_at timestamptz,
  approver_id uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,

  -- Set when the manager releases the result to the employee, after the
  -- feedback meeting. Until then the employee cannot see the manager's marks.
  disclosed_at timestamptz,

  -- Frozen copy of the computed scores, written when the evaluation is
  -- approved. Everything else in this schema can be edited by an admin; this
  -- column is what 第12条 disputes are actually adjudicated against.
  final_snapshot jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_id)
);

-- One row per goal. Quantitative and development goals are free text written by
-- the employee at the start of the period; behavioral rows are seeded from
-- behavior_guidelines.
create table if not exists public.term_evaluation_items (
  id uuid primary key default gen_random_uuid(),
  term_evaluation_id uuid not null
    references public.term_evaluations (id) on delete cascade,
  category public.evaluation_category not null,
  sort_order int not null default 0,

  title text not null default '',
  -- Only set for behavioral rows: the grade-specific expected behaviour text.
  expected_behavior text default '',

  -- 期首設定 / 中間進捗, plus the employee's own final self-assessment. Every
  -- column here is written and read by the employee, so the whole table can be
  -- exposed to them without further conditions.
  midterm_progress text default '',
  midterm_self_score int check (midterm_self_score between 1 and 5),
  self_comment text default '',
  self_score int check (self_score between 1 and 5),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The manager's marks live in their own table purely so that RLS can gate them.
-- Postgres policies decide row visibility, not column visibility, so leaving
-- manager_score on term_evaluation_items would mean an employee who reads their
-- own row could also read the manager's mark before the feedback meeting --
-- the exact thing the disclosure step exists to prevent. Splitting the table
-- turns that into a row-level question, which RLS can actually enforce.
create table if not exists public.term_evaluation_marks (
  item_id uuid primary key
    references public.term_evaluation_items (id) on delete cascade,
  term_evaluation_id uuid not null
    references public.term_evaluations (id) on delete cascade,
  manager_comment text default '',
  manager_score int check (manager_score between 1 and 5),
  final_score int check (final_score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists term_evaluations_user_period_idx
  on public.term_evaluations (user_id, period_id);
create index if not exists term_evaluation_items_parent_idx
  on public.term_evaluation_items (term_evaluation_id);
create index if not exists term_evaluation_marks_parent_idx
  on public.term_evaluation_marks (term_evaluation_id);

-- ---------------------------------------------------------------------------
-- Helpers

-- The second approver is the manager's own manager. Walking profiles.manager_id
-- avoids introducing a separate approver master. Admins approve at the top of
-- the chain, where no such person exists.
create or replace function public.is_second_approver_of(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles subject
    join public.profiles mgr on mgr.id = subject.manager_id
    where subject.id = target_user_id
      and mgr.manager_id = auth.uid()
  );
$$;

grant execute on function public.is_second_approver_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS

alter table public.job_grade_weights enable row level security;
alter table public.behavior_guidelines enable row level security;
alter table public.evaluation_periods enable row level security;
alter table public.term_evaluations enable row level security;
alter table public.term_evaluation_items enable row level security;
alter table public.term_evaluation_marks enable row level security;

-- Masters are readable by every signed-in user; only the service role writes them.
create policy "job_grade_weights_select_all" on public.job_grade_weights
  for select to authenticated using (true);
create policy "behavior_guidelines_select_all" on public.behavior_guidelines
  for select to authenticated using (true);
create policy "evaluation_periods_select_all" on public.evaluation_periods
  for select to authenticated using (true);

-- term_evaluations ----------------------------------------------------------
-- The employee always sees their own row. Hiding the manager's marks before
-- disclosure is enforced on the item table, not here, because the columns that
-- must stay hidden live there.
create policy "term_evaluations_select_own" on public.term_evaluations
  for select using (user_id = auth.uid());
create policy "term_evaluations_select_manager" on public.term_evaluations
  for select using (public.is_manager_of(user_id));
create policy "term_evaluations_select_approver" on public.term_evaluations
  for select using (public.is_second_approver_of(user_id));
create policy "term_evaluations_select_admin" on public.term_evaluations
  for select using (public.is_admin());

-- The employee may edit their own sheet only while it is still a draft; once
-- it goes for approval it is frozen to them.
create policy "term_evaluations_update_own_draft" on public.term_evaluations
  for update using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid() and status = 'draft');

create policy "term_evaluations_update_manager" on public.term_evaluations
  for update using (public.is_manager_of(user_id))
  with check (public.is_manager_of(user_id));
create policy "term_evaluations_update_approver" on public.term_evaluations
  for update using (public.is_second_approver_of(user_id))
  with check (public.is_second_approver_of(user_id));

-- term_evaluation_items -----------------------------------------------------
-- Only the employee's own goals and self-assessment live here, so self-access
-- is unconditional. The manager's marks are a separate table below.
create policy "term_evaluation_items_select_own" on public.term_evaluation_items
  for select using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and te.user_id = auth.uid()
    )
  );
create policy "term_evaluation_items_select_manager" on public.term_evaluation_items
  for select using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and public.is_manager_of(te.user_id)
    )
  );
create policy "term_evaluation_items_select_approver" on public.term_evaluation_items
  for select using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and public.is_second_approver_of(te.user_id)
    )
  );
create policy "term_evaluation_items_select_admin" on public.term_evaluation_items
  for select using (public.is_admin());

create policy "term_evaluation_items_write_own_draft" on public.term_evaluation_items
  for all using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id
        and te.user_id = auth.uid()
        and te.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id
        and te.user_id = auth.uid()
        and te.status = 'draft'
    )
  );

create policy "term_evaluation_items_write_manager" on public.term_evaluation_items
  for all using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and public.is_manager_of(te.user_id)
    )
  )
  with check (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and public.is_manager_of(te.user_id)
    )
  );

-- term_evaluation_marks -----------------------------------------------------
-- The disclosure rule, enforced at the database rather than in the app: the
-- employee sees the manager's marks only once the manager has released them
-- after the feedback meeting. Before that, the rows simply do not exist for
-- them, whatever query they run.
create policy "term_evaluation_marks_select_own_disclosed" on public.term_evaluation_marks
  for select using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id
        and te.user_id = auth.uid()
        and te.disclosed_at is not null
    )
  );

create policy "term_evaluation_marks_select_manager" on public.term_evaluation_marks
  for select using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and public.is_manager_of(te.user_id)
    )
  );
create policy "term_evaluation_marks_select_approver" on public.term_evaluation_marks
  for select using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and public.is_second_approver_of(te.user_id)
    )
  );
create policy "term_evaluation_marks_select_admin" on public.term_evaluation_marks
  for select using (public.is_admin());

-- Only the manager writes marks. The employee has no write policy at all, and
-- the second approver signs off on term_evaluations rather than editing marks.
create policy "term_evaluation_marks_write_manager" on public.term_evaluation_marks
  for all using (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and public.is_manager_of(te.user_id)
    )
  )
  with check (
    exists (
      select 1 from public.term_evaluations te
      where te.id = term_evaluation_id and public.is_manager_of(te.user_id)
    )
  );
