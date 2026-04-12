# Collector (apps/backend/collector)

AWS Lambda (Docker) + SQS + EventBridge + Playwright + Effect。

## パイプライン

1. **求人番号抽出** — EventBridge (平日 01:00 JST) → Lambda → Playwright → SQS
2. **求人詳細 ETL** — SQS (batchSize: 1) → Lambda → Playwright + linkedom → API POST

## 設計

- 1 メッセージ = 1 Lambda = フレッシュなブラウザ
- Effect.Service パターン（`JobDetailQueue` 等）
- インフラ: CDK (`infra/`)

## コマンド

```bash
pnpm dev:docker-up       # docker-compose up
pnpm dev:docker-down     # docker-compose down
pnpm dev:invoke-crawler  # 求人番号クローラー手動実行
pnpm dev:invoke-detail   # 求人詳細 ETL 手動実行
pnpm dev:e2e             # E2E パイプライン検証
pnpm test                # Vitest tests (PBT)
pnpm build               # tsdown ビルド
```
