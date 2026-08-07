-- Proves the disclosure rule holds at the database level, not just in the UI.
-- Cast of characters: employee -> manager -> director (second approver).
\set ON_ERROR_STOP on
\pset pager off

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'c@example.com');

-- handle_new_user() already created profiles rows; fill in the hierarchy.
update public.profiles set name='社員A', role='employee', job_grade='ippan',
  manager_id='22222222-2222-2222-2222-222222222222'
  where id='11111111-1111-1111-1111-111111111111';
update public.profiles set name='上長B', role='manager', job_grade='kacho',
  manager_id='33333333-3333-3333-3333-333333333333'
  where id='22222222-2222-2222-2222-222222222222';
update public.profiles set name='部長C', role='manager', job_grade='bucho'
  where id='33333333-3333-3333-3333-333333333333';

insert into public.evaluation_periods (id, year, half, starts_on, ends_on) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 2026, 'H1', '2026-01-01', '2026-06-30');

insert into public.term_evaluations (id, user_id, period_id, job_grade, stage, status) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000001', 'ippan', 'final', 'draft');

insert into public.term_evaluation_items (id, term_evaluation_id, category, title, self_score) values
  ('cccccccc-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001', 'behavioral', '常に誠実であれ', 4);

insert into public.term_evaluation_marks (item_id, term_evaluation_id, manager_score, manager_comment) values
  ('cccccccc-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001', 2, '期待水準に届いていない');

-- From here on, act as a normal signed-in user rather than the table owner.
set role authenticated;

\echo '--- 公開前: 社員本人 ---'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'items(自分の目標)' as what, count(*) from public.term_evaluation_items;
select 'marks(上長評価) ★0であるべき' as what, count(*) from public.term_evaluation_marks;

\echo '--- 公開前: 上長 ---'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'marks(上長評価) ★1であるべき' as what, count(*) from public.term_evaluation_marks;

\echo '--- 公開前: 二次承認者(部長) ---'
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select 'marks(上長評価) ★1であるべき' as what, count(*) from public.term_evaluation_marks;

\echo '--- 無関係な社員から見えないこと ---'
set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
select 'items ★0であるべき' as what, count(*) from public.term_evaluation_items;
select 'marks ★0であるべき' as what, count(*) from public.term_evaluation_marks;

-- Manager releases the result after the feedback meeting.
reset role;
update public.term_evaluations set disclosed_at = now()
  where id = 'bbbbbbbb-0000-0000-0000-000000000001';
set role authenticated;

\echo '--- 公開後: 社員本人 ---'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'marks(上長評価) ★1になるべき' as what, count(*) from public.term_evaluation_marks;
select manager_score, manager_comment from public.term_evaluation_marks;

\echo '--- 本人は上長評価を書き換えられない ---'
select count(*) as "更新できた行数 ★0であるべき" from (
  update public.term_evaluation_marks set manager_score = 5
  where item_id = 'cccccccc-0000-0000-0000-000000000001' returning 1
) t;

reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '--- 本人が上長評価を書き換えようとする ---'
with upd as (
  update public.term_evaluation_marks set manager_score = 5
  where item_id = 'cccccccc-0000-0000-0000-000000000001'
  returning 1
)
select count(*) as "書き換えられた行数 ★0であるべき" from upd;

\echo '--- 実際の値が変わっていないこと ---'
select manager_score as "★2のままであるべき" from public.term_evaluation_marks;

\echo '--- 承認依頼後は本人が自分の目標を編集できない ---'
reset role;
update public.term_evaluations set status='pending_approval'
  where id='bbbbbbbb-0000-0000-0000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
with upd as (
  update public.term_evaluation_items set self_score = 5
  where id = 'cccccccc-0000-0000-0000-000000000001'
  returning 1
)
select count(*) as "書き換えられた行数 ★0であるべき" from upd;
select self_score as "★4のままであるべき" from public.term_evaluation_items;
reset role;
