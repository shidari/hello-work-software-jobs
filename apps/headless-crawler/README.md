# Headless Crawler

ハローワーク求人情報の自動収集クローラー

**設計**: Effect-tsによるETL（Extract-Transform-Load）パイプライン  
**ヘッドレス理由**: セッション情報の保持が必要なため

**現状の取得範囲**: ソフトウェア関連求人の一部のみ対応（段階的拡張予定）

## コマンド

```bash
# セットアップ
pnpm install
pnpm exec playwright install chromium

# 検証
pnpm verify:e-t-crawler              # 求人番号抽出
pnpm verify:job-detail-extractor     # 求人詳細抽出
pnpm verify:transform-jobDetail      # データ変換
pnpm type-check                      # 型チェック

# デプロイ
pnpm bootstrap  # 初回のみ
pnpm deploy
```

## 環境変数

```bash
JOB_STORE_ENDPOINT=<job-store-api URL>
API_KEY=<認証キー>
QUEUE_URL=<SQS URL>
GITHUB_TOKEN=<GitHub token>
GITHUB_OWNER=<owner>
GITHUB_REPO=<repo>
```
