-- Two gaps found once the whole flow was walked end to end. Additive on top
-- of 0001-0003; those are never edited.
--
-- 1. The second approver could read the term_evaluations row they are asked to
--    sign off (0003) but NOT the subject's profile: profiles was still limited
--    to own row / direct reports / admin (0001, 0002). The 承認待ち screen
--    therefore had an approval request with no name attached to it.
--
-- 2. There was no way to administer profiles or evaluation periods from the
--    application at all -- README told the operator to use the Supabase Table
--    Editor. That is not something HR can be asked to do, and it stops working
--    entirely in the local (no-database) mode.

-- ---------------------------------------------------------------------------
-- 1. The second approver may read the profile of the person they approve.
--    Uses the SECURITY DEFINER helper from 0003 rather than a subquery on
--    profiles, to avoid a self-referential policy.
create policy "profiles_select_second_approver" on public.profiles
  for select using (public.is_second_approver_of(id));

-- ---------------------------------------------------------------------------
-- 2. Admin administers the employee master.
--
-- Note the asymmetry with 0001's profiles_update_own_name: an ordinary user
-- may edit their own row, but role / job_grade / manager_id are the levers
-- that decide who evaluates whom and how the points are weighted, so only
-- admin may set them. Column-level restriction is not expressible in a
-- policy, so the application form is what limits an ordinary user to their
-- own name -- and it is admin-only in the nav.
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

-- Evaluation periods were readable by everyone but writable by no one except
-- the service role, which meant a new half-year could not be opened without
-- direct database access.
create policy "evaluation_periods_insert_admin" on public.evaluation_periods
  for insert with check (public.is_admin());
create policy "evaluation_periods_update_admin" on public.evaluation_periods
  for update using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Column-level guard on the three fields that decide the outcome.
--
-- 0001 lets a user update their own profile row, which is how they edit their
-- own name. But role, job_grade and manager_id decide, respectively, what they
-- can see, how their points are weighted (a 一般 and a 部長 with identical
-- marks differ by tens of points), and who evaluates them. A policy cannot
-- restrict individual columns -- that limitation is the same one that forced
-- the manager's marks into their own table in 0003 -- so a trigger does it.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.job_grade is distinct from old.job_grade
     or new.manager_id is distinct from old.manager_id then
    raise exception '権限・役職・上長の変更は管理者のみ可能です'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();
