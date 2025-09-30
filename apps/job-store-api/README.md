# Job Store API

求人情報を管理するCloudflare Workers上で動作するREST APIです。

## 概要

Cloudflare WorkersとD1（SQLite）を使用した軽量なREST API。Honoフレームワークを採用し、型安全なバリデーションとOpenAPI仕様書の自動生成を実現しています。

## 技術スタック

- **実行環境**: Cloudflare Workers
- **Webフレームワーク**: Hono (v4.8.3)
- **データベース**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM (v0.44.2)
- **バリデーション**: Valibot (v1.1.0)
- **エラーハンドリング**: neverthrow (v8.2.0)
- **OpenAPI**: hono-openapi (v1.0.8) + @hono/swagger-ui (v0.5.2)
- **ビルドツール**: tsdown (v0.15.3)
- **デプロイツール**: Wrangler (v4.38.0)
- **テスト**: Vitest (v3.2.4)

## 主要機能

### OpenAPI仕様書の自動生成

- `/docs` - Swagger UIによるインタラクティブなAPI仕様書
- `/openapi` - OpenAPIスキーマのJSON出力
- ルートパス (`/`) から自動的にドキュメントページへリダイレクト

### RESTful API エンドポイント

#### 求人情報登録
- `POST /api/v1/jobs/`
- APIキー認証が必要（`x-api-key`ヘッダー）

#### 求人詳細取得
- `GET /api/v1/jobs/:jobNumber`
- 指定した求人番号の詳細情報を取得

#### 求人一覧取得（高度なフィルタリング対応）
- `GET /api/v1/jobs/`
- クエリパラメータ:
  - `companyName` - 会社名フィルタ（部分一致、URLエンコード対応）
  - `jobDescription` - 職務内容キーワード検索
  - `jobDescriptionExclude` - 除外キーワード検索
  - `employeeCountGt` - 従業員数範囲フィルタ（下限）
  - `employeeCountLt` - 従業員数範囲フィルタ（上限）
  - `onlyNotExpired` - 期限切れ求人の除外
  - `orderByReceiveDate` - 受信日時による並び順（`asc` または `desc`）

#### 継続ページネーション
- `GET /api/v1/jobs/continue?nextToken={token}`
- JWTトークンベースのページネーション（15分有効期限）

## 開発環境のセットアップ

### 前提条件

- Node.js (推奨: 最新LTS版)
- pnpm (v10.15.1以上)
- Cloudflare アカウント
- Wrangler CLI

### インストール

```bash
# 依存関係のインストール
pnpm install

# 型定義の生成
pnpm cf-typegen
```

### 開発サーバーの起動

```bash
# ローカルD1データベースにリモートデータをダンプして開発サーバーを起動
pnpm dev
```

ブラウザで [http://localhost:8787](http://localhost:8787) を開いてAPIドキュメントを確認できます。

### テスト実行

```bash
# 単体テスト
pnpm test

# 型チェック
pnpm type-check
```

## ビルド・デプロイ

### ビルド

```bash
pnpm build
```

### デプロイ

```bash
# Cloudflare Workersにデプロイ
pnpm deploy
```

## データベース管理

### マイグレーション

Drizzle Kitを使用してデータベースマイグレーションを管理します。

```bash
# スキーマ変更を適用
pnpm exec drizzle-kit generate

# マイグレーションを実行
pnpm exec wrangler d1 migrations apply job-store
```

### リモートデータのダンプ

```bash
# リモートD1データベースからデータをエクスポート
pnpm dump-remote-data
```

### スキーマのコピー

```bash
# スキーマを他のパッケージにコピー
pnpm copy-schema
```

## トラブルシューティング

### ローカル開発時にD1エラーが発生する場合

```bash
# リモートデータを再ダンプ
pnpm dump-remote-data

# 開発サーバーを再起動
pnpm dev
```

### マイグレーションエラー

```bash
# マイグレーション履歴を確認
pnpm exec wrangler d1 migrations list job-store

# 手動でマイグレーションを適用
pnpm exec wrangler d1 migrations apply job-store --remote
```

## 環境変数

以下の環境変数が必要です（`wrangler.jsonc`または`.dev.vars`で設定）：

```bash
API_KEY=<API認証キー>
JWT_SECRET=<JWT署名用シークレット>
```

## ライセンス

ISC
