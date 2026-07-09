# microCMS セットアップ手順

このドキュメント通りにmicroCMS側の設定を終えると、`kanri`（管理画面）と
`mmg_Recruitment_LP`（採用LP）がmicroCMS経由でデータをやり取りできるようになります。

## 1. microCMSサービスを作成

1. https://microcms.io/ でアカウント作成 → 新規サービス作成
   （サービスドメインは何でも良い。例: `mmg-recruit`）
2. 作成したサービスドメイン名を控えておく（後で `MICROCMS_SERVICE_DOMAIN` に使う）

## 2. APIを4つ作成する

管理画面の「API作成」から、**すべて「リスト形式」**で以下の4つを作成します。
API IDは必ず下記の通りにしてください（コード側がこのIDで参照しています）。

### API ID: `business`（事業内容）

| フィールドID | 表示名 | 種類 | 備考 |
|---|---|---|---|
| title | タイトル | テキストフィールド | 必須 |
| iconKey | アイコン | テキストフィールド | `measure` / `design` / `research` のいずれかを入力 |
| items | 項目 | テキストエリア | 1行1項目（例: 基準点測量） |
| note | 補足 | テキストフィールド | 任意（例: など） |
| order | 表示順 | 数値 | 必須。小さい順に表示 |

### API ID: `jobs`（募集職種）

| フィールドID | 表示名 | 種類 | 備考 |
|---|---|---|---|
| title | タイトル | テキストフィールド | 必須 |
| iconKey | アイコン | テキストフィールド | `entry`（未経験者向け） / `experienced`（経験者向け） |
| tags | タグ | テキストエリア | カンマ区切りで1行（例: 未経験者歓迎, 正社員） |
| duties | 仕事内容 | テキストエリア | 1行1項目 |
| salaryBase | 基本給 | テキストフィールド | |
| salaryDaily | 日給 | テキストフィールド | |
| age | 年齢 | テキストフィールド | |
| qualification | 必要な資格・免許 | テキストフィールド | |
| qualificationNote | 資格・免許の補足 | テキストエリア | 1行1項目・任意 |
| experience | 必要な経験 | テキストフィールド | |
| careerPath | キャリアパス | テキストエリア | 任意 |
| highlights | 活躍できる方 | テキストエリア | 1行1項目・任意 |
| order | 表示順 | 数値 | 必須 |

### API ID: `benefits`（待遇・福利厚生）

| フィールドID | 表示名 | 種類 | 備考 |
|---|---|---|---|
| title | タイトル | テキストフィールド | 必須 |
| iconKey | アイコン | テキストフィールド | `schedule` / `insurance` / `certification` / `transport` / `salary` / `training` |
| description | 説明 | テキストエリア | |
| order | 表示順 | 数値 | 必須 |

### API ID: `voices`（先輩の声）

| フィールドID | 表示名 | 種類 | 備考 |
|---|---|---|---|
| name | お名前 | テキストフィールド | 必須 |
| role | 役職・経歴 | テキストフィールド | |
| quote | コメント | テキストエリア | |
| avatar | アバター絵文字 | テキストフィールド | 任意（現状LP側では未使用） |
| order | 表示順 | 数値 | 必須 |

> iconKeyは自由記述のテキストフィールドで構いません（本来はセレクトフィールドの方が入力ミスを防げますが、
> kanri側の管理画面フォームがドロップダウンを出すので実運用上は問題ありません）。

## 3. APIキーを2種類発行する

microCMSの「サービス設定」→「APIキー」から、**用途を分けて2つ**発行します。

1. **管理画面(kanri)用キー** — GET/POST/PUT/PATCH/DELETE すべて許可
   → `kanri` の環境変数 `MICROCMS_API_KEY` に設定
2. **LP読み取り専用キー** — GETのみ許可
   → `mmg_Recruitment_LP` の環境変数 `MICROCMS_API_KEY` に設定

同じキーを両方で使い回さないでください。LP側はブラウザから直接叩かれるわけではなく
サーバー側(`/api/content.js`)でしか使いませんが、万一の漏洩時の被害を抑えるため
読み取り専用キーにしておくのが安全です。

## 4. 環境変数の設定

### kanri（ローカル: `kanri/.env.local`、本番: Vercelプロジェクト設定）

```
MICROCMS_SERVICE_DOMAIN=作成したサービスドメイン
MICROCMS_API_KEY=管理画面用フルアクセスキー
ADMIN_USER=任意の管理者ID
ADMIN_PASSWORD=任意のパスワード
```

### mmg_Recruitment_LP（ローカル: `.env.local`、本番: Vercelプロジェクト設定）

既存の `SLACK_WEBHOOK_URL` に加えて以下を追加:

```
MICROCMS_SERVICE_DOMAIN=作成したサービスドメイン
MICROCMS_API_KEY=LP用読み取り専用キー
```

## 5. 初期データを投入する

1. 上記2〜4が終わったら、`kanri` ディレクトリで:
   ```
   node scripts/migrate-to-microcms.js --dry-run   # 内容確認
   node scripts/migrate-to-microcms.js              # 実際にアップロード
   ```
2. microCMSの管理画面で4つのAPIにデータが入っていることを確認

## 6. デプロイ

1. `kanri` を新しいVercelプロジェクトとしてデプロイ（`mmg_Recruitment_LP`とは別プロジェクト）
2. Vercelの環境変数に上記の値を設定
3. デプロイ後、Basic認証（ADMIN_USER/ADMIN_PASSWORD）でログインして動作確認
4. `mmg_Recruitment_LP` 側にも `MICROCMS_SERVICE_DOMAIN` / `MICROCMS_API_KEY` を環境変数として追加し、再デプロイ

これ以降、カードの内容変更は **kanriから行い**、LPは自動的にmicroCMSの最新データを表示します
（microCMSから直接編集しても反映されます）。
