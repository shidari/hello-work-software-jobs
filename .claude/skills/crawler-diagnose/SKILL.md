---
name: crawler-diagnose
description: クローラーパイプラインの診断。EventBridge, Lambda, SQS の状態を一括確認し、ETL エラーログを分析する。AWS_PROFILE=crawler-debug が必要。
---

# クローラー診断

## 使い方

```bash
# パイプライン全体診断
bash .claude/skills/crawler-diagnose/scripts/crawler-diagnose.sh

# 直近 N 分の ETL エラーログ（デフォルト 30 分）
bash .claude/skills/crawler-diagnose/scripts/check-job-detail-etl-logs.sh [MINUTES]
```

## 個別スクリプト

- `scripts/crawler-diagnose.sh` — EventBridge + Lambda + SQS の一括チェック
- `scripts/check-eventbridge.sh` — EventBridge ルール状態
- `scripts/check-lambda.sh <function-name>` — Lambda 関数の詳細
- `scripts/check-sqs.sh` — SQS キュー状態
- `scripts/check-job-detail-etl-logs.sh [minutes]` — ETL エラーログ分析

## 前提条件

- `AWS_PROFILE=crawler-debug` が設定されていること
- AWS CLI がインストールされていること
- リージョン: ap-northeast-1
