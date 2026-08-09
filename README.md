# 昭和建設工業 人事評価システム

日報・週報をシステム上で入力し、AIが週ごとに評価を蓄積して、期末の評価シートまでつなげる仕組みです。

できること:

- 従業員が日報・週報を入力する
- 週報提出時に、その週の日報・週報をもとにAI（Claude API）が評価項目ごとのスコア・コメントと総評を生成する
- 上長が部下の日報・週報・AI評価を一覧で確認する
- 期末評価（期首の目標設定 → 中間進捗 → 最終評価 → 上長評価 → 二次承認 → 本人へ公開）
- 管理者が社員の役職・上長・権限と、評価期間を設定する

## すぐ動かす（Supabase・APIキーなし）

```bash
npm install
npm run dev
```

`.env.local` を置かなければ**ローカルモード**で起動します。データは `.data/db.json`
（Git管理外）に保存され、Supabaseの代わりにファイルが、Claude APIの代わりに
ローカルの評価器が使われます。初期状態に戻したいときは `.data` を消してください。

ログイン画面に表示されるアカウントから選べます（パスワードは全員 `showa2026`）。

| アカウント | 役職 | 見えるもの |
|---|---|---|
| 山田 太郎 | 一般 | 自分の日報・週報・評価 |
| 佐藤 次郎 | 課長（山田の上長） | チーム画面、部下の評価の採点・公開 |
| 田中 部長 | 部長（佐藤の上長） | 二次承認 |
| 管理者 | admin | 管理画面（社員マスタ・評価期間） |

この3階層があるので、**期首 → 中間 → 期末 → 上長評価 → 二次承認 → 本人へ公開**を
1つのブラウザで通しで確認できます。

### ローカルモードで割り切っていること

- **認証は本物ではありません。** 全員共通のデモパスワードで、署名付きCookieを発行するだけです
- **AI週次評価はAIではありません。** 日報・週報の記述から、語の出現と繰り返しを見て機械的に
  点を出しています。画面には「ローカル生成（AI未接続）」と明示され、`model_version` にも
  `local-rule-based` が入ります。**仕事の中身は評価していません**
- ただし**誰が何を見られるかは本番と同じ規則で動きます**。マイグレーションのRLSポリシーを
  TypeScriptに移植してあり（`src/lib/local/policy.ts`）、同じ判定表を `npm test` で検証しています

`.env.local` に値を入れれば、コードを変えずにSupabase / Claude API に切り替わります。

## 技術スタック

- [Next.js](https://nextjs.org)（App Router / TypeScript）+ Tailwind CSS
- [Supabase](https://supabase.com)（Postgres + Auth + Row Level Security）
- [Anthropic Claude API](https://docs.claude.com)（週次AI評価の生成）
- [Vercel](https://vercel.com)（ホスティング + Cron による週次バッチ）

## 本番セットアップ（Supabase + Claude API）

### 1. Supabaseプロジェクトを作成する

1. [supabase.com](https://supabase.com) でプロジェクトを新規作成する。
2. Project Settings > API から以下を控える。
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（**絶対にブラウザに公開しない**）
3. SQL Editor で以下を**この順に**実行する。
   - `supabase/migrations/0001_init.sql`（テーブル・RLSポリシー）
   - `supabase/migrations/0002_manager_dashboard.sql`（上長・adminの閲覧ポリシー）
   - `supabase/migrations/0003_term_evaluation.sql`（期末評価・二段階承認・公開制御）
   - `supabase/migrations/0004_admin_and_approver_access.sql`（管理画面と二次承認者の権限）
   - `supabase/seed.sql`（AI週次評価の評価項目。実際の評価シートに合わせて編集して構いません）
   - `supabase/seed_term_evaluation.sql`（**行動指針30件と評価期間。これを流さないと期末評価が機能しません**）
4. Authentication > Users から、最初のアカウントを作成する（メール/パスワード）。
   - サインアップ時に `profiles` へ自動で行が作られます（初期 role は `employee`）。
   - **最初の1人だけ** Table Editor で `role` を `admin` にしてください。
     以降の役職・上長・権限の設定は、アプリの管理画面（`/admin`）から行えます。

### 2. 環境変数を設定する

`.env.example` を `.env.local` にコピーし、値を埋める。

```bash
cp .env.example .env.local
```

- `ANTHROPIC_API_KEY`: [Claude Console](https://console.anthropic.com) で発行したAPIキー
- `ANTHROPIC_MODEL`: 省略可（デフォルトは `claude-sonnet-5`）
- `CRON_SECRET`: 週次バッチ用の任意の文字列（Vercelにデプロイする場合はVercelの環境変数にも同じ値を設定し、Vercel Cronが自動的に `Authorization: Bearer <値>` を付与します）

### 3. 依存関係のインストールとローカル起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くとログイン画面が表示されます。

### 4. 動作確認の流れ

1. Supabaseで作成したテスト従業員アカウントでログインする。
2. 「日報」から数日分の日報を入力する。
3. 「週報」で対象週を確認し、振り返りコメントを入力して提出する。
   - 提出すると同時にAI週次評価が生成されます（Claude APIを呼び出すため数秒かかります）。
4. 「AI週次評価」で生成されたスコア・コメント・総評を確認する。

RLSの確認として、2つ目のテストアカウントを作成し、お互いの日報・週報・AI評価が見えないことも確認してください。

## 週次バッチ（保険機構）

週報の提出時にその場でAI評価を生成しますが、提出し忘れ等に備えて `/api/evaluations/generate` への `GET` リクエスト（`Authorization: Bearer $CRON_SECRET` 必須）で、前週分の未評価者をまとめて評価するバッチも用意しています。Vercelにデプロイすると `vercel.json` の設定により毎週月曜7:00(JST)に自動実行されます。

## ディレクトリ構成（主要部分）

```
src/
  app/
    login/                      # ログイン画面
    (app)/                      # 認証必須の画面グループ
      page.tsx                  # ホーム（ダッシュボード）
      daily/                    # 日報入力・一覧
      weekly/                   # 週報入力（週ごとの日報集計を含む）
      evaluations/              # AI週次評価の一覧・詳細
      evaluations/term/         # 期末評価（本人側）
      team/                     # 上長ダッシュボード・部下の期末評価
      approvals/                # 二次承認者の承認待ち一覧
      admin/                    # 社員マスタ・評価期間（adminのみ）
    api/evaluations/generate/   # AI評価生成のAPIルート（手動トリガー & 週次バッチ）
  lib/
    supabase/                   # Supabaseクライアント（server / admin）。未設定ならlocalへ委譲
    local/                      # データベース無しで動かすための一式（下記）
    evaluation/                 # スコア計算・プロンプト生成・Claude API・ローカル評価器・認可
    auth/                       # ログイン/ログアウトのServer Actions
    team/                       # 上長・部下の取得と権限チェック
    date/week.ts                # 週（月〜日）の計算ユーティリティ
  types/database.ts             # DBスキーマに対応するTypeScript型
supabase/
  migrations/0001_init.sql               # テーブル・RLSポリシー
  migrations/0002_manager_dashboard.sql  # 上長の閲覧用ポリシー
  migrations/0003_term_evaluation.sql    # 期末評価（期・目標・上長評価・承認）
  migrations/0004_admin_and_approver_access.sql  # 管理画面・二次承認者・列単位のガード
  tests/                                 # RLSの検証（実際のPostgresで実行）
  seed.sql                               # AI週次評価の評価項目（プレースホルダー）
  seed_term_evaluation.sql               # 行動指針30件・評価期間
```

### `src/lib/local/` — データベース無しで動かす仕組み

| ファイル | 役割 |
|---|---|
| `client.ts` | Supabaseクライアントの代役。使っている演算子だけを実装 |
| `policy.ts` | **マイグレーションのRLSをTypeScriptに移植したもの** |
| `store.ts` | `.data/db.json` の読み書き |
| `seed.ts` | 初期データ（`supabase/seed*.sql` と同じ内容＋デモ用の組織） |
| `policy.test.ts` | `supabase/tests/01_term_evaluation_rls.sql` と同じ判定表を検証 |

アプリ側の24ファイルは Supabase クライアントをそのまま呼んでおり、
`createClient()` が何を返すかだけが切り替わります（`src/lib/supabase/server.ts`）。

## 期末評価について

社内の評価シート（Excel）と人事評価規程に合わせて実装している。

- **評価期間**: 上期1-6月 / 下期7-12月。賃金規定 第29条の賞与月（7月・12月）に対応
- **3区分**: 部門定量項目 / 行動指針項目 / 育成・支援・管理・自己研鑽項目（人事評価規程 第5条）
- **配点**: 各項目5点満点。区分ごとに `(Σ点 ÷ (採点済み件数 × 5)) × 役職別ウェイト × 100` を求め、
  3区分を合算して100点満点。ウェイトは役職で決まる（`job_grade_weights`）
- **流れ**: 期首設定 → 中間進捗 → 最終評価 → 上長評価 → 二次承認 → 本人へ公開

計算はExcelの数式をそのまま移植しており、実際に記入済みのシートの数値と一致することを
`npm test` で検証している（`src/lib/evaluation/score.test.ts`）。

### 運用前に必要な準備

1. **`supabase/seed_term_evaluation.sql` を流す。**
   行動指針30件（5指針 × 6役職）と、2026年の上期・下期が入る。
   何度流しても重複しない（`on conflict do update`）。
   **これを流さないと行動指針項目が0件の評価シートができる**（一般職なら配点の8割が欠落する）。
   シート作成時に行動指針が引けない場合はエラーを返して中断するようにしてあるが、
   気づかないまま運用に入らないよう最初に流しておくこと
2. `/admin/members` で各社員の**役職・上長・権限**を設定する。
   役職（`job_grade`）は配点ウェイトを、上長（`manager_id`）は評価者と二次承認者を決める。
   権限（`role`）とは別物
3. `/admin/periods` で翌期以降を追加する（上期・下期を選ぶと日付は自動で入る）

### 上長評価が本人に見えるタイミング

上長評価は `term_evaluation_marks` に分離してあり、上長が「公開」を押して
`term_evaluations.disclosed_at` が入るまで、**RLSによって本人からは行ごと見えない**。
Postgresのポリシーは列単位の制御ができないため、同じテーブルに置くと本人が自分の行を
読めるポリシー経由で面談前の評点まで読めてしまう。検証手順は `supabase/tests/README.md`。

## 検証

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm test            # スコア計算・ローカル評価器・RLS等価性
npm run build
```

`npm test` の中身:

| ファイル | 何を守っているか |
|---|---|
| `src/lib/evaluation/score.test.ts` | Excelの数式の移植が、記入済みの実シートと小数まで一致すること |
| `src/lib/local/policy.test.ts` | **公開前に本人が上長評価を見られないこと**ほか、RLSと同じ判定 |
| `src/lib/evaluation/local-generate.test.ts` | ローカル評価器が全項目満点にならず、記述内容を反映すること |

実際のPostgresに対するRLSの検証手順は `supabase/tests/README.md`。
CI（`.github/workflows/ci.yml`）は**環境変数を一切設定せずに**上記を全部流します。
Supabaseにつながっていなくてもビルドとテストが通ることが、ローカルモードの前提だからです。

## 今後のフェーズ（未実装）

- 期首目標に対する根拠を日報・週報から集めるAI支援（現在は週次評価のみ）
- 提出リマインダー・通知
- 評価点から賞与額への換算（人事評価規程 第10条2項が「別に定める」としており、
  そのルール自体がまだ存在しない）
- 実際の評価項目への差し替え（`supabase/seed.sql` はAI週次評価用のプレースホルダー）
