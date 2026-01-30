# job-store-api

Cloudflare Workers 求人情報管理 API

## エンドポイント

```
GET  /                        # ドキュメントへリダイレクト
GET  /docs                    # Swagger UI
GET  /openapi                 # OpenAPI仕様書 JSON

POST /api/v1/jobs/            # 求人登録 (要APIキー)
GET  /api/v1/jobs/:jobNumber  # 求人詳細取得
GET  /api/v1/jobs/            # 求人一覧取得 (フィルタ対応)
GET  /api/v1/jobs/continue    # ページネーション継続
```

## コマンド

```bash
# セットアップ
pnpm install
pnpm cf-typegen

# 開発サーバー (port 8787)
pnpm dev

# テスト
pnpm test
pnpm type-check

# ビルド・デプロイ
pnpm build
pnpm deploy

# データベース
pnpm dump-remote-data
pnpm copy-schema
```

## 環境変数

`.dev.vars`:
```bash
API_KEY=<認証キー>
JWT_SECRET=<OpenSSL生成: openssl rand -base64 32>
```

本番環境はCloudflare Dashboardで設定。
