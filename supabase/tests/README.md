# RLSポリシーの検証

期末評価は賞与・昇職に反映され（人事評価規程 第10条）、本人が不服申立てを行える
（同 第12条）。そのため「誰が何を見られるか」は画面の作りではなく**データベース側で
保証されている必要がある**。ここではそれを実際のPostgresに対して検証する。

特に重要なのは、**上長評価が公開前に本人から見えないこと**。
Postgresのポリシーは行の可視性しか制御できず列は制御できないため、上長の評点は
`term_evaluation_items` ではなく `term_evaluation_marks` に分離してある。これにより
「公開前は行ごと存在しない」状態を作れる。

## 実行方法

Supabaseに接続せず、使い捨てのPostgresで完結する。

```bash
export PATH="/usr/lib/postgresql/16/bin:$PATH"
PGDIR=/tmp/pgtest
rm -rf "$PGDIR" && mkdir -p "$PGDIR" && chown postgres "$PGDIR"

su postgres -c "PATH=/usr/lib/postgresql/16/bin:\$PATH initdb -D $PGDIR/data -A trust -E UTF8"
su postgres -c "PATH=/usr/lib/postgresql/16/bin:\$PATH pg_ctl -D $PGDIR/data \
  -o '-k $PGDIR -p 55432 -c listen_addresses=' -l $PGDIR/log start"

P() { su postgres -c "psql -h $PGDIR -p 55432 -d postgres -v ON_ERROR_STOP=1 -q -f $1"; }

P supabase/tests/00_supabase_stubs.sql
P supabase/migrations/0001_init.sql
P supabase/migrations/0002_manager_dashboard.sql
P supabase/migrations/0003_term_evaluation.sql

# Supabaseが既定で行っているGRANT相当を再現する
su postgres -c "psql -h $PGDIR -p 55432 -d postgres -q -c '
  create role authenticated;
  grant usage on schema public to authenticated;
  grant select, insert, update, delete on all tables in schema public to authenticated;'"

P supabase/tests/01_term_evaluation_rls.sql
```

## 期待される結果

`★` が付いた行が判定ポイント。以下がすべて満たされること。

| 状況 | 期待 |
|---|---|
| 公開前・本人 | 自分の目標は見えるが、**上長評価は0件** |
| 公開前・上長 | 上長評価が見える |
| 公開前・二次承認者 | 上長評価が見える |
| 無関係な社員 | 目標も上長評価も0件 |
| 公開後・本人 | 上長評価が見える |
| 本人が上長評価をUPDATE | 0行（書き換え不可） |
| 承認依頼後に本人が自分の目標をUPDATE | 0行（凍結される） |

## 注意

`00_supabase_stubs.sql` はSupabaseが提供する `auth.uid()` / `auth.role()` /
`auth.users` の最小限の代用品で、**本番には適用しない**。マイグレーションを
無改変のまま素のPostgresで流すためだけに存在する。
