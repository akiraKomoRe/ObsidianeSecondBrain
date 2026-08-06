-- Manager dashboard: read-only access for managers/admins to their team's data.
-- Additive on top of 0001_init.sql -- never edit that file.

-- SECURITY DEFINER so these helpers bypass RLS on their own internal lookups
-- (the table owner is exempt from RLS by default), avoiding any need to
-- reason about self-referencing RLS recursion on profiles.
create or replace function public.is_manager_of(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = target_user_id and manager_id = auth.uid()
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_manager_of(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- profiles: a manager may read their direct reports' profile rows.
-- Plain column comparison, no subquery on profiles -- no recursion risk.
create policy "profiles_select_team" on public.profiles
  for select using (manager_id = auth.uid());

-- profiles: admin reads every profile (company-wide read access, ahead of
-- a future admin UI).
create policy "profiles_select_admin_all" on public.profiles
  for select using (public.is_admin());

create policy "daily_reports_select_team" on public.daily_reports
  for select using (public.is_manager_of(user_id));
create policy "daily_reports_select_admin_all" on public.daily_reports
  for select using (public.is_admin());

create policy "weekly_reports_select_team" on public.weekly_reports
  for select using (public.is_manager_of(user_id));
create policy "weekly_reports_select_admin_all" on public.weekly_reports
  for select using (public.is_admin());

-- weekly_ai_evaluations: read-only for managers/admins. No insert/update
-- policy is added here either -- finalizing evaluations is out of scope;
-- only the service role can write these rows.
create policy "weekly_ai_evaluations_select_team" on public.weekly_ai_evaluations
  for select using (public.is_manager_of(user_id));
create policy "weekly_ai_evaluations_select_admin_all" on public.weekly_ai_evaluations
  for select using (public.is_admin());
