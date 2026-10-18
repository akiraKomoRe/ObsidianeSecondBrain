-- Seed data for the term (半期) evaluation, transcribed from the company's
-- 役職別評価ウェイト sheet.
--
-- Kept out of the migrations on purpose: these are operational values that
-- change when the HR scheme changes (人事評価規程 第13条 allows for periodic
-- review), and re-running this file must not require a schema migration.
-- Safe to run repeatedly.
--
-- Note that 取締役 and 部長 share identical expected-behaviour wording. That
-- is how the source sheet reads, not a transcription slip.

-- ---------------------------------------------------------------------------
-- 行動指針: five company-wide guidelines, worded per job grade.
-- The behavioral category is seeded from these when an employee starts a sheet
-- (see createTermEvaluation in src/app/(app)/evaluations/term/actions.ts), so
-- an empty table here means a sheet with no behavioral goals at all.
insert into public.behavior_guidelines (sort_order, title, job_grade, expected_behavior) values
  -- 取締役
  (1, '①地域・仲間との和に寄り添う存在であれ',       'director', '社内外と信頼関係を築き、調和を守る。地域との共創を推進'),
  (2, '②地域社会の未来を想像し、創造する存在であれ', 'director', '地域・行政・顧客と連携し、次世代に貢献'),
  (3, '③技術を磨くプロフェッショナルであれ',         'director', '技術伝承体制を整え、専門性を高める'),
  (4, '④主体的にものごとを捉え、推進できる存在であれ','director', '経営課題を把握し、全社視点で推進'),
  (5, '⑤常に誠実であれ',                             'director', '倫理観を持ち、組織の信頼を守る'),
  -- 部長
  (1, '①地域・仲間との和に寄り添う存在であれ',       'bucho', '社内外と信頼関係を築き、調和を守る。地域との共創を推進'),
  (2, '②地域社会の未来を想像し、創造する存在であれ', 'bucho', '地域・行政・顧客と連携し、次世代に貢献'),
  (3, '③技術を磨くプロフェッショナルであれ',         'bucho', '技術伝承体制を整え、専門性を高める'),
  (4, '④主体的にものごとを捉え、推進できる存在であれ','bucho', '経営課題を把握し、全社視点で推進'),
  (5, '⑤常に誠実であれ',                             'bucho', '倫理観を持ち、組織の信頼を守る'),
  -- 課長
  (1, '①地域・仲間との和に寄り添う存在であれ',       'kacho', '部門連携を促し、チームの関係性を強化'),
  (2, '②地域社会の未来を想像し、創造する存在であれ', 'kacho', '部門改善提案を推進し、発展を担う'),
  (3, '③技術を磨くプロフェッショナルであれ',         'kacho', '専門知識を深化させ、若手を育成'),
  (4, '④主体的にものごとを捉え、推進できる存在であれ','kacho', '部門方針を設計し、計画的に実行'),
  (5, '⑤常に誠実であれ',                             'kacho', '誠実な姿勢で部下・顧客と向き合う'),
  -- 係長
  (1, '①地域・仲間との和に寄り添う存在であれ',       'kakaricho', '職場の調整役として風通しを保つ'),
  (2, '②地域社会の未来を想像し、創造する存在であれ', 'kakaricho', '担当業務内で改善を実行'),
  (3, '③技術を磨くプロフェッショナルであれ',         'kakaricho', '専門スキルを磨き、後輩に指導'),
  (4, '④主体的にものごとを捉え、推進できる存在であれ','kakaricho', '課の課題を捉え、改善を主導'),
  (5, '⑤常に誠実であれ',                             'kakaricho', '是正・報告を正確に行い、誠実対応'),
  -- 主任
  (1, '①地域・仲間との和に寄り添う存在であれ',       'shunin', '同僚・協力業者と円滑に連携'),
  (2, '②地域社会の未来を想像し、創造する存在であれ', 'shunin', '現場・顧客の声を改善提案に反映'),
  (3, '③技術を磨くプロフェッショナルであれ',         'shunin', '正確・丁寧に遂行し、資格取得に努める'),
  (4, '④主体的にものごとを捉え、推進できる存在であれ','shunin', '課題を発見し提案・実行'),
  (5, '⑤常に誠実であれ',                             'shunin', '約束を守り信頼を積み上げる'),
  -- 一般
  (1, '①地域・仲間との和に寄り添う存在であれ',       'ippan', '仲間との協力を重視し、報連相を徹底'),
  (2, '②地域社会の未来を想像し、創造する存在であれ', 'ippan', '日々の業務で課題意識を持つ'),
  (3, '③技術を磨くプロフェッショナルであれ',         'ippan', '知識・技術を吸収し成長する'),
  (4, '④主体的にものごとを捉え、推進できる存在であれ','ippan', '目標を意識して業務に取り組む'),
  (5, '⑤常に誠実であれ',                             'ippan', '礼儀と素直な姿勢で業務に臨む')
on conflict (sort_order, job_grade) do update set
  title = excluded.title,
  expected_behavior = excluded.expected_behavior;

-- ---------------------------------------------------------------------------
-- 評価期間: halves run Jan-Jun and Jul-Dec, lining up with the July and
-- December bonus months in 賃金規定 第29条.
insert into public.evaluation_periods (year, half, starts_on, ends_on, status) values
  (2026, 'H1', '2026-01-01', '2026-06-30', 'closed'),
  (2026, 'H2', '2026-07-01', '2026-12-31', 'open')
on conflict (year, half) do update set
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on;
