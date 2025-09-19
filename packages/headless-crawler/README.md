# Headless Crawler

ハローワークの求人情報を自動収集するためのヘッドレスクローラーシステムです。

## アーキテクチャ

このシステムは以下のAWSサービスを使用しています：

- **AWS Lambda**: クローリング・スクレイピング処理
- **Amazon SQS**: ジョブキューとデッドレターキュー
- **Amazon EventBridge**: 定期実行スケジュール
- **Amazon SNS**: アラート通知
- **Amazon CloudWatch**: メトリクス監視

## 主要機能

### 1. 求人情報クローリング
- 定期的にハローワークサイトから求人情報を収集
- EventBridgeによる自動スケジュール実行（毎週月曜日午前1時）

### 2. スクレイピング処理
- SQSキューからジョブを受信して個別の求人詳細を取得
- 失敗時の自動リトライ機能（最大3回）

### 3. デッドレターキュー監視
- 処理に失敗したメッセージを自動監視
- 平日毎日午前9時にチェック実行
- エラー発生時にGitHub Issueを自動作成
- 詳細なエラー情報とトラブルシューティング項目を含む

## 環境変数

以下の環境変数が必要です：

```bash
# 必須
JOB_STORE_ENDPOINT=<求人データ保存先API>
API_KEY=<API認証キー>
QUEUE_URL=<SQSキューURL>
MAIL_ADDRESS=<アラート通知先メールアドレス>

# GitHub連携（オプション）
GITHUB_TOKEN=<GitHubアクセストークン>
```

## デプロイ

```bash
# 依存関係のインストール
pnpm install

# CDKデプロイ
pnpm exec cdk deploy --all --require-approval never
```

## 開発用コマンド

```bash
# TypeScript型チェック
pnpm run type-check

# クローラーの動作確認
pnpm run verify:crawler

# スクレイパーの動作確認
pnpm run verify:scraper
```

## 監視とアラート

### CloudWatchアラーム
- Lambda実行回数が1000回/時間を超えた場合にSNS通知

### デッドレターキュー監視
- 処理失敗メッセージの自動検出
- GitHub Issue自動作成による問題追跡
- 詳細なエラー情報とスタックトレースの記録

## トラブルシューティング

### よくある問題

1. **Lambda実行エラー**
   - CloudWatchログを確認
   - メモリ不足の場合はメモリサイズを調整

2. **デッドレターキューにメッセージが蓄積**
   - GitHub Issueで詳細なエラー情報を確認
   - 根本原因を修正後、必要に応じてメッセージを再処理

3. **GitHub Issue作成エラー**
   - GITHUB_TOKEN環境変数の設定を確認
   - トークンの権限（Issues作成権限）を確認
