-- Phase 1 (MVP) schema for 昭和建設工業 人事評価システム
-- Tables: profiles, daily_reports, weekly_reports, evaluation_criteria, weekly_ai_evaluations

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: 1 row per auth.users row. manager_id is self-referencing so the
-- org hierarchy is already modeled even though the manager UI ships in a
-- later phase.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'employee' check (role in ('employee', 'manager', 'admin')),
  department text,
  manager_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new Supabase auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- daily_reports
-- ---------------------------------------------------------------------------
create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  report_date date not null,
  work_content text not null default '',
  work_hours numeric(4, 1),
  issues text default '',
  tomorrow_plan text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, report_date)
);

-- ---------------------------------------------------------------------------
-- weekly_reports (week is stored as its Monday/Sunday date range)
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  self_reflection text default '',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- evaluation_criteria: shared, company-wide list of what the AI scores each
-- week against. Seeded with placeholder construction-industry items; the
-- real evaluation-sheet items replace these once shared.
-- ---------------------------------------------------------------------------
create table if not exists public.evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text default '',
  category text,
  weight numeric(4, 2) not null default 1,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- weekly_ai_evaluations: one AI-generated evaluation per user per week.
-- Only ever written by the server (service role) via the evaluation
-- pipeline -- never directly by an authenticated client.
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  criteria_scores jsonb not null default '[]'::jsonb,
  overall_summary text default '',
  model_version text,
  generated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- keep updated_at fresh on daily_reports / weekly_reports
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.daily_reports;
create trigger set_updated_at
  before update on public.daily_reports
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.weekly_reports;
create trigger set_updated_at
  before update on public.weekly_reports
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.daily_reports enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.evaluation_criteria enable row level security;
alter table public.weekly_ai_evaluations enable row level security;

-- profiles: everyone can read their own row only (Phase 1 has no manager UI yet)
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own_name" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- daily_reports: full CRUD on your own rows only
create policy "daily_reports_select_own" on public.daily_reports
  for select using (auth.uid() = user_id);
create policy "daily_reports_insert_own" on public.daily_reports
  for insert with check (auth.uid() = user_id);
create policy "daily_reports_update_own" on public.daily_reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_reports_delete_own" on public.daily_reports
  for delete using (auth.uid() = user_id);

-- weekly_reports: full CRUD on your own rows only
create policy "weekly_reports_select_own" on public.weekly_reports
  for select using (auth.uid() = user_id);
create policy "weekly_reports_insert_own" on public.weekly_reports
  for insert with check (auth.uid() = user_id);
create policy "weekly_reports_update_own" on public.weekly_reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- evaluation_criteria: readable by any authenticated user, no client writes
create policy "evaluation_criteria_select_authenticated" on public.evaluation_criteria
  for select using (auth.role() = 'authenticated');

-- weekly_ai_evaluations: readable by the owning employee only.
-- No insert/update policy is defined for the authenticated role, so only
-- the service role (which bypasses RLS) can write these rows.
create policy "weekly_ai_evaluations_select_own" on public.weekly_ai_evaluations
  for select using (auth.uid() = user_id);
