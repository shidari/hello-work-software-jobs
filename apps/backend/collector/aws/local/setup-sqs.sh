#!/bin/bash
# LocalStack に SQS キュー (メイン + DLQ) を作成する
set -euo pipefail

ENDPOINT_URL="${SQS_ENDPOINT_URL:-http://localstack:4566}"
REGION="${AWS_REGION:-ap-northeast-1}"

echo "Waiting for LocalStack..."
until aws sqs list-queues --endpoint-url "$ENDPOINT_URL" --region "$REGION" 2>/dev/null; do
  sleep 1
done

# DLQ を先に作成
aws sqs create-queue \
  --queue-name job-detail-dlq \
  --endpoint-url "$ENDPOINT_URL" \
  --region "$REGION"

DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url "${ENDPOINT_URL}/000000000000/job-detail-dlq" \
  --attribute-names QueueArn \
  --endpoint-url "$ENDPOINT_URL" \
  --region "$REGION" \
  --query 'Attributes.QueueArn' \
  --output text)

# メインキュー + RedrivePolicy
aws sqs create-queue \
  --queue-name job-detail-queue \
  --endpoint-url "$ENDPOINT_URL" \
  --region "$REGION" \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

echo "SQS queues created successfully (main + DLQ, maxReceiveCount: 3)"
