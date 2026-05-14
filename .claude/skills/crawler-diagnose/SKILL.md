---
name: crawler-diagnose
description: クローラーパイプラインの診断。EventBridge, Lambda, SQS の状態を一括確認し、ETL エラーログを分析する。実行は ops MCP (ops-aws-api / ops-aws-cloudwatch) 経由で、dev sandbox から直接 AWS には繋がない。
---

# クローラー診断

dev sandbox から awscli は撤去済み。実 AWS への到達経路は ops container
(`sho-mcp-ops`) に閉じている。本 skill では以下の MCP server を呼び出して
パイプライン状態を確認する:

| 用途 | MCP server | 主に使う tool |
|------|-----------|---------------|
| 一般 AWS API (EventBridge / Lambda / SQS) | `ops-aws-api` (read-only) | `call_aws` 系（aws cli と同じ命令を `args` で渡す） |
| CloudWatch Logs / Metrics | `ops-aws-cloudwatch` | `execute_log_insights_query` / `analyze_log_group` / `get_metric_data` |

リージョンは `ap-northeast-1` 固定。credentials は ops container 側で
`AWS_PROFILE=crawler-debug` が解決される（dev sandbox 側で profile を持つ必要なし）。

## 一括診断のフロー

以下を順番に MCP で呼んで結果をユーザーに報告する:

1. **EventBridge ルール状態** — `ops-aws-api` で `events describe-rule --name collector-weekday-cron --region ap-northeast-1` 相当を呼び、`State` / `ScheduleExpression` を取得
2. **Lambda 関数 (job-number-crawler)** — `ops-aws-api` で `lambda get-function --function-name job-number-crawler --region ap-northeast-1`。`Configuration.State` / `Timeout` / `LastModified` を確認
3. **Lambda 関数 (job-detail-etl)** — 同上、`--function-name job-detail-etl`
4. **SQS キュー (job-detail-queue)** — `ops-aws-api` で `sqs get-queue-url --queue-name job-detail-queue` → そのまま `sqs get-queue-attributes` で `ApproximateNumberOfMessages` / `ApproximateNumberOfMessagesNotVisible` / `ApproximateNumberOfMessagesDelayed` を取得
5. **集約結果** — それぞれの戻りから「ルール状態 / 各 Lambda の状態と最終更新 / キュー詰まり具合」を 1 つのテーブルにまとめて報告

## ETL エラーログ分析

直近 N 分（デフォルト 30 分）の job-detail-etl エラーを `ops-aws-cloudwatch`
の `execute_log_insights_query` で取得する。

ロググループ: `/aws/lambda/job-detail-etl`
クエリ例:

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 200
```

戻り message を JSON parse して `errorMessage` 等から `*Error` タグを抽出、
件数で集計してユーザーに分布と直近サンプルを示す。

## 注意

- write 系 API（queue purge / message delete 等）は `ops-aws-api` 側で
  `READ_OPERATIONS_ONLY=true` により拒否される。書き込みが必要な場合は
  ops container の env を一時的に切り替える運用判断が要る（通常は禁止）。
- 認証エラーが返る場合は host の `~/.aws/{config,credentials}` に
  `crawler-debug` profile があるか確認し、必要なら `aws sso login --profile
  crawler-debug` を host で実行してから ops container を `--stop` → 再起動して
  snapshot を取り直す。
