#!/usr/bin/env bash
set -euo pipefail
region="ap-northeast-1"
url=$(aws sqs get-queue-url --queue-name job-detail-queue --region "$region" --output json | jq -r '.QueueUrl')
aws sqs get-queue-attributes \
  --queue-url "$url" \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible ApproximateNumberOfMessagesDelayed \
  --region "$region" \
  --output json \
  | jq '{name:"sqs:job-detail-queue", waiting:.Attributes.ApproximateNumberOfMessages|tonumber, inflight:.Attributes.ApproximateNumberOfMessagesNotVisible|tonumber, delayed:.Attributes.ApproximateNumberOfMessagesDelayed|tonumber}'
