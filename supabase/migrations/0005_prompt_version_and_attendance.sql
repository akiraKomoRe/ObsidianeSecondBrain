-- Two things the walkthrough exposed. Additive on top of 0001-0004; those are
-- never edited.
--
-- 1. A weekly AI evaluation recorded which model produced it but not which
--    prompt. 人事評価規程 第12条 lets an employee contest their evaluation, and
--    the first question in any such review is "what was this score based on?".
--    Model alone does not answer that -- the same model with a rewritten prompt
--    scores differently.
--
-- 2. The system had no concept of whether a person was working on a given day.
--    The "今週の日報 n/5件" figure counted Mon-Fri, so a public holiday, 年末年始
--    or a day of 有給 all read as a missed report, and the AI evaluator was told
--    the same thing.

-- ---------------------------------------------------------------------------
-- 1. Which prompt produced the scores.
alter table public.weekly_ai_evaluations
  add column if not exists prompt_version text;

comment on column public.weekly_ai_evaluations.prompt_version is
  'src/lib/evaluation/prompt.ts の WEEKLY_PROMPT_VERSION（ローカル評価器なら LOCAL_PROMPT_VERSION）。本文は git 履歴が正。';

-- ---------------------------------------------------------------------------
-- 2. Working days.
--
-- Two tables rather than one, because the two have different owners and
-- different lifetimes: the company calendar is set once a year by 総務 and
-- applies to everyone, while leave is per-person and arrives continuously.
-- Once ジョブカン勤怠 is connected, personal_leaves becomes its sync target and
-- company_holidays stays hand-maintained.

create table if not exists public.company_holidays (
  holiday_on date primary key,
  label text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.personal_leaves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  leave_on date not null,
  -- 有給 / 欠勤 / 特別休暇 / 振替休日 など。集計には使わず表示のためだけ。
  -- 稼働日から除く条件は「行が存在すること」で、種別では変えない。
  kind text not null default 'paid_leave',
  -- ジョブカン連携後、どこから来た行かを区別するため。手入力は 'manual'。
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  primary key (user_id, leave_on)
);

create index if not exists personal_leaves_date_idx
  on public.personal_leaves (leave_on);

-- ---------------------------------------------------------------------------
-- RLS
--
-- The company calendar is not confidential -- everyone needs it to know whether
-- they owe a report today -- but only admin may edit it.
alter table public.company_holidays enable row level security;
alter table public.personal_leaves enable row level security;

create policy "company_holidays_select_all" on public.company_holidays
  for select to authenticated using (true);
create policy "company_holidays_write_admin" on public.company_holidays
  for all using (public.is_admin()) with check (public.is_admin());

-- Leave, by contrast, is personal. Who was off and why is exactly the kind of
-- thing that should not be visible sideways between colleagues, so the same
-- three-way visibility as the evaluations themselves applies: self, one's
-- manager, admin.
create policy "personal_leaves_select_own" on public.personal_leaves
  for select using (user_id = auth.uid());
create policy "personal_leaves_select_manager" on public.personal_leaves
  for select using (public.is_manager_of(user_id));
create policy "personal_leaves_select_admin" on public.personal_leaves
  for select using (public.is_admin());
create policy "personal_leaves_write_admin" on public.personal_leaves
  for all using (public.is_admin()) with check (public.is_admin());
