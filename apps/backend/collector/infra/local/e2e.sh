#!/usr/bin/env bash
# E2E パイプライン検証スクリプト。
# job-number-crawler → SQS → job-detail-etl → API 確認 を一気通貫で実行する。
# Usage: ./e2e.sh [max_count]
#   max_count: 処理する求人数（デフォルト: 3）
#
# 前提:
#   - docker compose up 済み（LocalStack + Lambda コンテナ）
#   - API サーバー起動済み（localhost:8787）
#
# SQS 操作は host / dev sandbox の awscli ではなく、docker compose の
# localstack service に同梱されている awslocal を `docker compose exec` で
# 呼ぶ。これで実行環境側に awscli を要求しない（dev sandbox から awscli
# を撤去した後の前提）。
set -euo pipefail

MAX_COUNT="${1:-3}"
CRAWLER_URL="http://localhost:9000/2015-03-31/functions/function/invocations"
LAMBDA_URL="${LAMBDA_ENDPOINT:-http://localhost:9001}/2015-03-31/functions/function/invocations"
API_URL="${JOB_STORE_ENDPOINT:-http://localhost:8787}"
# localstack container 内部からは自身を localhost:4566 で見られるので
# QUEUE_URL は固定値で良い（host 側の SQS_ENDPOINT_URL を持ち出す必要はない）。
QUEUE_URL="http://localhost:4566/000000000000/job-detail-queue"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# localstack 内で実行する awslocal の wrapper。-T で stdin TTY を切る
# （非対話、CI でも動く）。
awslocal_in_localstack() {
  docker compose -f "$COMPOSE_FILE" exec -T localstack awslocal "$@"
}

echo "=== E2E Pipeline Test ==="
echo "  max_count: $MAX_COUNT"
echo ""

# --- Step 1: job-number-crawler → SQS ---
echo "[Step 1] job-number-crawler (period=today, maxCount=$MAX_COUNT)"
crawler_response=$(curl -s -X POST "$CRAWLER_URL" -d "{
  \"queryStringParameters\":{\"period\":\"today\",\"maxCount\":\"$MAX_COUNT\"},
  \"headers\":{\"x-api-key\":\"dev-secret\"},
  \"requestContext\":{},
  \"isBase64Encoded\":false
}")
echo "  response: $crawler_response"
echo ""

# --- Step 2: SQS → job-detail-etl (Event Source Mapping 模倣) ---
echo "[Step 2] SQS -> job-detail-etl"
processed=0
failures=0

while true; do
  result=$(awslocal_in_localstack sqs receive-message \
    --queue-url "$QUEUE_URL" \
    --max-number-of-messages 1 \
    --wait-time-seconds 1 \
    --output json 2>/dev/null || echo '{}')

  message_id=$(echo "$result" | jq -r '.Messages[0].MessageId // empty')

  if [ -z "$message_id" ]; then
    echo ""
    echo "  Done. processed=$processed, failures=$failures"
    break
  fi

  body=$(echo "$result" | jq -r '.Messages[0].Body')
  receipt=$(echo "$result" | jq -r '.Messages[0].ReceiptHandle')
  job_number=$(echo "$body" | jq -r '.jobNumber')

  printf "  [%d] %s ... " "$((processed + 1))" "$job_number"

  payload=$(jq -n --arg mid "$message_id" --arg body "$body" '{
    Records: [{
      messageId: $mid,
      receiptHandle: "local",
      body: $body,
      attributes: {},
      messageAttributes: {},
      md5OfBody: "",
      eventSource: "aws:sqs",
      eventSourceARN: "",
      awsRegion: "ap-northeast-1"
    }]
  }')

  response=$(curl -s -X POST "$LAMBDA_URL" -d "$payload" 2>/dev/null || echo "ERROR")

  if [ "$response" = "null" ]; then
    echo "ok"
    awslocal_in_localstack sqs delete-message \
      --queue-url "$QUEUE_URL" \
      --receipt-handle "$receipt" 2>/dev/null || true
  else
    echo "FAILED: $response"
    failures=$((failures + 1))
  fi

  processed=$((processed + 1))

  if [ "$MAX_COUNT" -gt 0 ] && [ "$processed" -ge "$MAX_COUNT" ]; then
    echo ""
    echo "  Reached max ($MAX_COUNT). processed=$processed, failures=$failures"
    break
  fi
done
echo ""

# --- Step 3: API 確認 ---
echo "[Step 3] API verification"
meta=$(curl -s "$API_URL/jobs" | jq '.meta')
total=$(echo "$meta" | jq '.totalCount')
echo "  totalCount: $total"

if [ "$total" -gt 0 ]; then
  echo ""
  echo "  Latest jobs:"
  curl -s "$API_URL/jobs" | jq -r '.jobs[] | "    \(.jobNumber) | \(.occupation) | \(.wageType) \(.wage.min)-\(.wage.max)"'
fi

echo ""
echo "=== E2E Complete ==="
