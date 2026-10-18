-- Placeholder evaluation criteria for a construction company.
-- Replace/edit these once the real evaluation sheet items are shared --
-- the AI evaluation pipeline reads this table dynamically, so no code
-- changes are needed when these rows change.

insert into public.evaluation_criteria (key, label, description, category, weight, sort_order, is_active)
values
  ('safety', '安全管理', '現場での安全確認・KY活動・ヒヤリハット報告など、安全に関する意識と行動', '施工', 1.2, 10, true),
  ('quality', '品質管理', '図面・仕様への準拠、施工品質、手戻りの少なさ', '施工', 1.2, 20, true),
  ('schedule', '工程管理', '工程遅延の有無、進捗報告の的確さ、段取りの良さ', '施工', 1.0, 30, true),
  ('cost_awareness', 'コスト意識', '資材・人員配置・手待ちなど、コストを意識した動きができているか', '施工', 0.8, 40, true),
  ('teamwork', 'チームワーク・協調性', '協力会社・他職種との連携、報連相の質', '対人', 1.0, 50, true),
  ('initiative', '主体性・改善提案', '指示待ちでなく課題を見つけて動けているか、改善提案の有無', '対人', 1.0, 60, true),
  ('growth', '成長・自己研鑽', '新しい技術や資格取得への取り組み、振り返りの質', '成長', 0.8, 70, true)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  weight = excluded.weight,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
