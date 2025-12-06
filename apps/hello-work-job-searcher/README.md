# hello-work-job-searcher

ハローワーク求人検索アプリ (Next.js 15 + React 19)

## コマンド

```bash
# セットアップ
pnpm install

# 開発サーバー (port 9002)
pnpm dev

# ビルド・本番起動
pnpm build
pnpm start

# テスト
pnpm test
pnpm type-check
```

## 環境変数

`.env.local`:
```bash
JOB_STORE_ENDPOINT=<job-store-api URL>
# 例: https://job-store.hello-work-searher-api.workers.dev/api/v1
```
