# Headless Crawler

ハローワーク求人情報の自動収集クローラー

**設計**: Effect-ts による ETL（Extract-Transform-Load）パイプライン
**ヘッドレス理由**: セッション情報の保持が必要なため

**現状の取得範囲**: ソフトウェア関連求人の一部のみ対応（段階的拡張予定）

## コマンド

```bash
# ローカル E2E（docker-compose: Lambda + LocalStack）
pnpm dev:docker-up
pnpm dev:docker-down
pnpm dev:invoke-crawler       # 求人番号クローラー手動実行
pnpm dev:invoke-detail        # 求人詳細 ETL 手動実行
pnpm dev:e2e                  # E2E パイプライン検証

# 実サイトに対する単発スモーク
pnpm dev:verify-job-number-crawler
pnpm dev:verify-job-detail-crawler
pnpm dev:verify-detail-search
pnpm dev:dump-html            # 検索結果ページ HTML ダンプ

# テスト・型チェック・ビルド
pnpm test                     # Vitest（PBT + coverage sweep）
pnpm type-check
pnpm build                    # tsdown

# デプロイ（CDK、`infra/` で実行）
cd infra && pnpm exec cdk deploy
```

## ランタイム環境変数

```
JOB_STORE_ENDPOINT=<job-store API URL>
API_KEY=<認証キー>
SQS_QUEUE_URL=<SQS URL>
```

AWS 認証情報（`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION`）は Lambda の実行ロール経由、ローカルでは docker-compose が注入。

## 診断

CloudWatch Logs の横断検索は `/crawler-diagnose` / `/debug` skill を使用（詳細は [../../../.claude/rules/cli.md](../../../.claude/rules/cli.md)）。
