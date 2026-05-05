# Collector (apps/backend/collector)

AWS Lambda (Docker) + SQS + EventBridge + Playwright + Effect。

## パイプライン

1. **求人番号抽出** — EventBridge (平日 01:00 JST) → Lambda → Playwright → SQS
2. **求人詳細 ETL** — SQS (batchSize: 1) → Lambda → Playwright + linkedom → API POST

## 設計

- 1 メッセージ = 1 Lambda = フレッシュなブラウザ
- Effect.Service パターン（`JobDetailQueue` 等）
- インフラ: CDK (`infra/`)
- **環境設定**: `Mode` Tag (production / dev / test) の discriminated union で dev は `dumpDir` を、test は `snapshots` を variant に持つ
- **テスト**: `Mode.test` で `page.route` を仕込んで URL マッチで snapshot HTML を fulfill。実 chromium + 固定フィクスチャで crawler ロジックを検証する。フィクスチャは `lib/hellowork/__tests__/__fixtures__/` 配下、CSS は `__shared__/` で共有

## コマンド

```bash
pnpm dev:docker-up       # docker-compose up
pnpm dev:docker-down     # docker-compose down
pnpm dev:invoke-crawler  # 求人番号クローラー手動実行
pnpm dev:invoke-detail   # 求人詳細 ETL 手動実行
pnpm dev:e2e             # E2E パイプライン検証
pnpm test                # Vitest tests (PBT + fixture 駆動 crawler テスト)
pnpm build               # tsdown ビルド
pnpm tsx lib/hellowork/scripts/build-fixtures.ts    # fixture HTML 再生成
pnpm tsx lib/hellowork/scripts/render-fixtures.ts   # fixture を .debug/fixtures/ に PNG 出力
```
