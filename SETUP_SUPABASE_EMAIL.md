# Supabase + Gmail自動返信 セットアップ手順

お問い合わせフォームの送信内容をSupabaseに保存してkanriで管理し、
送信直後にGmail（office.mmg.inc@gmail.com）から自動受付メールを送るための設定です。

## 1. Supabaseプロジェクトを作成

1. https://supabase.com/ でアカウント作成 → 「New Project」
2. プロジェクト名・パスワード・リージョン（Tokyo推奨: `ap-northeast-1`）を設定して作成
3. 作成完了まで数分待つ

## 2. テーブルを作成

Supabaseダッシュボードの「SQL Editor」で以下を実行してください。

```sql
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  tel text,
  job text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'done'))
);

alter table public.inquiries enable row level security;
```

> RLSを有効にしたままポリシーを一切作らないことで、公開用（publishable）キーからは一切アクセスできず、
> サーバー側だけで使う **secret key（service_role）** だけがアクセスできる状態になります。
> フロントエンドから直接Supabaseを叩くことは一切ないので、これで安全です。

## 3. 接続情報を控える

「Project Settings」→「API Keys」から以下をメモ:

- **Project URL**（例: `https://xxxxxxxxxxxx.supabase.co`）
- **Secret key**（`sb_secret_...`。`Publishable key`ではない方。絶対にブラウザ側のコードに書かないこと）

## 4. Gmailアプリパスワードを発行

Gmail SMTP（smtp.gmail.com）経由で `office.mmg.inc@gmail.com` から送信します。

1. `office.mmg.inc@gmail.com` でログインした状態で https://myaccount.google.com/security を開く
2. 「2段階認証プロセス」が無効なら有効化する（アプリパスワードの発行に必須）
3. https://myaccount.google.com/apppasswords を開く
4. アプリ名に「kanri採用フォーム」などと入力して生成
5. 表示される16桁のパスワード（例: `abcd efgh ijkl mnop`）を控える（スペースは除いても含めてもOK）

## 5. 環境変数の設定

### mmg_Recruitment_LP（フォーム送信時にSupabase保存＋Gmail自動返信）

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=（secretキー）
GMAIL_USER=office.mmg.inc@gmail.com
GMAIL_APP_PASSWORD=（16桁のアプリパスワード）
```

### kanri（お問い合わせ一覧の閲覧・ステータス更新）

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=（同上）
```

## 6. 動作確認

1. LPのお問い合わせフォームから実際に送信
2. Supabaseの「Table Editor」→ `inquiries` にレコードが増えているか確認
3. 送信したメールアドレスに受付完了メールが届くか確認（`office.mmg.inc@gmail.com`からの送信になります）
4. kanriの「お問い合わせ」タブに一覧表示されるか確認

## 補足: Gmail送信の制限

個人のGmailアカウントは1日あたりの送信件数に上限（目安200〜500件/日）があります。
応募フォームの想定送信数であれば通常問題ありませんが、将来的に件数が増える場合は
Google Workspace（独自ドメインメール）への移行を検討してください。
