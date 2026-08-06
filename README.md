# 昭和建設工業 人事評価システム（Phase 1 / MVP）

日報・週報をシステム上で入力し、AIが週ごとに評価を生成・蓄積していく仕組みの第一段階です。

Phase 1 でできること:

- 従業員が日報・週報を入力する
- 週報提出時に、その週の日報・週報をもとにAI（Claude API）が評価項目ごとのスコア・コメントと総評を生成する
- 生成されたAI週次評価を本人が閲覧できる
- ログイン後のホーム画面で、今日の日報提出状況・今週の進捗・直近のAI評価を一目で確認できる

上長ダッシュボード・期末の評価シート自動生成・上長による最終確認/確定ワークフローは次フェーズで実装します。

## 技術スタック

- [Next.js](https://nextjs.org)（App Router / TypeScript）+ Tailwind CSS
- [Supabase](https://supabase.com)（Postgres + Auth + Row Level Security）
- [Anthropic Claude API](https://docs.claude.com)（週次AI評価の生成）
- [Vercel](https://vercel.com)（ホスティング + Cron による週次バッチ）

## セットアップ手順

### 1. Supabaseプロジェクトを作成する

1. [supabase.com](https://supabase.com) でプロジェクトを新規作成する。
2. Project Settings > API から以下を控える。
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（**絶対にブラウザに公開しない**）
3. SQL Editor で以下を順番に実行する。
   - `supabase/migrations/0001_init.sql`（テーブル・RLSポリシー作成）
   - `supabase/seed.sql`（評価項目の初期データ投入。会社の実際の評価シートに合わせて内容を編集して構いません）
4. Authentication > Users から、テスト用の従業員アカウントを作成する（メール/パスワード）。
   - サインアップ時に `profiles` テーブルへ自動でプロフィール行が作成されます（初期roleは `employee`）。

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
    api/evaluations/generate/   # AI評価生成のAPIルート（手動トリガー & 週次バッチ）
  lib/
    supabase/                   # Supabaseクライアント（browser / server / admin）
    evaluation/                 # 評価プロンプト生成・Claude API呼び出し
    auth/                       # ログイン/ログアウトのServer Actions
    date/week.ts                # 週（月〜日）の計算ユーティリティ
  types/database.ts             # DBスキーマに対応するTypeScript型
supabase/
  migrations/0001_init.sql      # テーブル・RLSポリシー
  seed.sql                      # 評価項目の初期データ（プレースホルダー）
```

## 今後のフェーズ（未実装）

- 上長ダッシュボード（部下の日報/週報を週・日ごとに一覧表示）
- 期末の評価シート自動生成（週次AI評価の蓄積からのロールアップ）
- 上長による最終評価の確認・修正・確定ワークフロー
- 提出リマインダー・通知
- 実際の評価項目への差し替え（`supabase/seed.sql` を編集して反映）
