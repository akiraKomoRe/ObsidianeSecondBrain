-- 部門目標と、個人の部門定量目標との紐付け。
--
-- 0003 が入れた三区分のうち「部門定量項目」は、名前に反して部門と無関係だった。
-- 本人が期首に自由記述で立てるだけで、部長が定めた部門目標とのつながりが
-- どこにも無い。`profiles.department` はただの文字列（'工事第一課'）で、
-- 部署という実体もその責任者も存在しなかった。
--
-- ここで足すのは3つ:
--   1. 部署マスタ（親子関係と部長を持つ）
--   2. 期ごとの部門目標（部長が定める）
--   3. 個人の部門定量項目から部門目標への参照
--
-- 配点には一切触れない。人事評価規程 第5条の三区分・100点満点は不変で、
-- 部門目標は「その個人目標が何に紐づくか」という文脈情報にとどめる。
-- `src/lib/evaluation/score.ts` は無変更。

-- ---------------------------------------------------------------------------
-- 1. 部署マスタ

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- 工事第一課 は 工事本部 の下、というような入れ子。上位部署の目標も
  -- 下位部署の社員が選べるようにするために要る。
  parent_id uuid references public.departments (id) on delete set null,
  -- その部署の長。部門目標を書けるのはこの人（と管理者）だけ。
  head_id uuid references public.profiles (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists departments_parent_idx on public.departments (parent_id);

-- 既存の `profiles.department` は text のまま残す。今回の移行で名前一致から
-- department_id を埋め、表示は id 経由に切り替えるが、text 列は次期まで
-- 落とさない（取りこぼした行があっても情報が消えないように）。
alter table public.profiles
  add column if not exists department_id uuid references public.departments (id) on delete set null;

create index if not exists profiles_department_idx on public.profiles (department_id);

-- ---------------------------------------------------------------------------
-- 2. 部門目標

create table if not exists public.department_goals (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  period_id uuid not null references public.evaluation_periods (id) on delete cascade,
  sort_order int not null default 0,

  title text not null,
  description text not null default '',
  -- 「売上◯億」「事故0件」のような達成基準。定量目標の紐付け先である以上、
  -- 何をもって達成とするかは目標側が持っていないと個人が測りようがない。
  target_metric text not null default '',

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists department_goals_dept_period_idx
  on public.department_goals (department_id, period_id);

-- ---------------------------------------------------------------------------
-- 3. 個人の部門定量項目 → 部門目標

alter table public.term_evaluation_items
  add column if not exists department_goal_id uuid
    references public.department_goals (id) on delete set null;

-- NULL を許すのは必須。行動指針・育成の行には紐付け先が無いし、部門目標が
-- まだ設定されていない期の部門定量項目も NULL のまま成立しなければならない。
-- ただし「部門定量項目以外に部門目標がぶら下がる」のは意味を成さないので、
-- そこだけは型で塞ぐ。
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'term_evaluation_items_goal_only_quantitative'
  ) then
    alter table public.term_evaluation_items
      add constraint term_evaluation_items_goal_only_quantitative
      check (department_goal_id is null or category = 'quantitative');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- ヘルパー
--
-- 0003 の is_manager_of / is_second_approver_of と同じ書き方に揃える。
-- SECURITY DEFINER なのは、ポリシーの中から departments を引くと
-- departments 自身のポリシーが再帰的に効いてしまうため。

-- その部署の長か、上位部署の長か。部長は配下の課の目標も定められる。
create or replace function public.is_department_head_of(target_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive chain as (
    select id, parent_id, head_id
      from public.departments
     where id = target_department_id
    union all
    select d.id, d.parent_id, d.head_id
      from public.departments d
      join chain c on d.id = c.parent_id
  )
  select exists (select 1 from chain where head_id = auth.uid());
$$;

grant execute on function public.is_department_head_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
--
-- 部署も部門目標も秘密ではない。むしろ全社員が読めないと、自分の目標を
-- 何に紐づけるべきか選べない。制限がかかるのは書き込み側だけ。

alter table public.departments enable row level security;
alter table public.department_goals enable row level security;

drop policy if exists "departments_select_all" on public.departments;
create policy "departments_select_all" on public.departments
  for select to authenticated using (true);
drop policy if exists "departments_write_admin" on public.departments;
create policy "departments_write_admin" on public.departments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "department_goals_select_all" on public.department_goals;
create policy "department_goals_select_all" on public.department_goals
  for select to authenticated using (true);

-- 書けるのはその部署（または上位部署）の長と管理者だけ。
drop policy if exists "department_goals_insert_head" on public.department_goals;
create policy "department_goals_insert_head" on public.department_goals
  for insert with check (
    public.is_department_head_of(department_id) or public.is_admin()
  );
drop policy if exists "department_goals_update_head" on public.department_goals;
create policy "department_goals_update_head" on public.department_goals
  for update using (
    public.is_department_head_of(department_id) or public.is_admin()
  ) with check (
    public.is_department_head_of(department_id) or public.is_admin()
  );
drop policy if exists "department_goals_delete_head" on public.department_goals;
create policy "department_goals_delete_head" on public.department_goals
  for delete using (
    public.is_department_head_of(department_id) or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 締めた期の部門目標は動かせない。
--
-- 期末評価が確定したあとで、その根拠だった部門目標が書き換わると、規程 第12条の
-- 不服申立てで何を見ればいいのか分からなくなる。ポリシーでは他テーブル
-- （evaluation_periods）の状態を条件にしづらいので、トリガーで止める。
create or replace function public.guard_closed_period_department_goals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_period uuid;
begin
  target_period := coalesce(new.period_id, old.period_id);
  if exists (
    select 1 from public.evaluation_periods
     where id = target_period and status = 'closed'
  ) then
    raise exception '終了した評価期間の部門目標は変更できません'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists department_goals_guard_closed_period on public.department_goals;
create trigger department_goals_guard_closed_period
  before insert or update or delete on public.department_goals
  for each row execute function public.guard_closed_period_department_goals();

-- ---------------------------------------------------------------------------
-- 既存データの移行
--
-- profiles.department の文字列から部署を起こし、department_id を埋める。
-- 親子関係と部長は名前だけからは決まらないので、管理画面で設定してもらう。
insert into public.departments (name, sort_order)
select distinct department, 0
  from public.profiles
 where department is not null and department <> ''
on conflict (name) do nothing;

update public.profiles p
   set department_id = d.id
  from public.departments d
 where p.department_id is null
   and p.department = d.name;
