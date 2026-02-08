# Headless Crawler

ハローワーク求人情報の自動収集クローラー

**設計**: Effect-tsによるETL（Extract-Transform-Load）パイプライン  
**アーキテクチャ**: 関数型ドメイン駆動設計 + ワークフローベースETL  
**ヘッドレス理由**: セッション情報の保持が必要なため

**現状の取得範囲**: ソフトウェア関連求人の一部のみ対応（段階的拡張予定）

## アーキテクチャ

### ワークフローベースETL

クローラーは、再利用可能なワークフローパターンに基づいて構築されています：

```
lib/workflow/
├── types.ts          # ワークフロー型定義（Stage, Workflow）
├── domain.ts         # ドメインモデル（Extract/Transform/Loadドメイン）
├── errors.ts         # エラー型定義（ステージごと）
├── etl.ts            # ETLワークフロー定義
└── stages/           # ETLステージ実装
    ├── extract.ts            # 求人番号抽出
    ├── extract-job-detail.ts # 求人詳細HTML抽出
    ├── transform.ts          # データ変換
    └── load.ts               # データ永続化
```

詳細は [`lib/workflow/README.md`](./lib/workflow/README.md) を参照してください。

### Lambda関数

- **ET-JobNumberHandler**: 求人番号を抽出してSQSキューに送信
- **E-T-L-JobDetailHandler**: 求人詳細を抽出・変換・ロード

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

## 設計原則

1. **関数型ドメイン駆動設計**: ドメインモデルを中心に、純粋な関数でビジネスロジックを表現
2. **ワークフローパターン**: 再利用可能なステージを組み合わせてパイプラインを構築
3. **型安全性**: TypeScriptの型システムを活用した完全な型安全性
4. **明示的なエラーハンドリング**: Effect-tsの力を借りた構造化されたエラー処理
