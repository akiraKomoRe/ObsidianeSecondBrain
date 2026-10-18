-- Reproduces what createTermEvaluation does, to confirm that a new sheet now
-- actually gets its five behavioral goals. Before the seed existed this
-- produced zero rows -- i.e. a 一般職 sheet missing the 0.8-weight category.
\set ON_ERROR_STOP on
\pset pager off

insert into auth.users (id, email) values
  ('44444444-4444-4444-4444-444444444444', 'ippan@example.com');
update public.profiles set name='一般社員', job_grade='ippan'
  where id='44444444-4444-4444-4444-444444444444';

-- Same insert the server action performs.
insert into public.term_evaluations (id, user_id, period_id, job_grade, stage, status)
select
  'dddddddd-0000-0000-0000-000000000001',
  '44444444-4444-4444-4444-444444444444',
  p.id, 'ippan', 'goal_setting', 'draft'
from public.evaluation_periods p where p.year = 2026 and p.half = 'H2';

-- Same seeding step: copy the guidelines for this person's grade.
insert into public.term_evaluation_items
  (term_evaluation_id, category, sort_order, title, expected_behavior)
select
  'dddddddd-0000-0000-0000-000000000001', 'behavioral', g.sort_order, g.title, g.expected_behavior
from public.behavior_guidelines g
where g.job_grade = 'ippan'
order by g.sort_order;

\echo '--- 行動指針項目が生成されたか（★5件であるべき／穴があった時は0件） ---'
select count(*) as "件数" from public.term_evaluation_items
where term_evaluation_id = 'dddddddd-0000-0000-0000-000000000001'
  and category = 'behavioral';

\echo '--- 一般職向けの期待行動が入っているか ---'
select sort_order, title, expected_behavior
from public.term_evaluation_items
where term_evaluation_id = 'dddddddd-0000-0000-0000-000000000001'
order by sort_order;

\echo '--- 役職ごとに文言が出し分けられているか（同じ指針①を6役職で比較） ---'
select job_grade, expected_behavior
from public.behavior_guidelines where sort_order = 1
order by job_grade;
