#!/bin/bash
# SQSキューをパージ（全メッセージ削除）
set -euo pipefail

QUEUE_URL="https://sqs.ap-northeast-1.amazonaws.com/370519913758/HeadlessCrawlerStack-ToJobDetailExtractThenTransformThenLoadQueue73-jGilAAiBwqV5"

echo "Purging queue..."
aws sqs purge-queue --queue-url "$QUEUE_URL"
echo "Done. Queue purged."
