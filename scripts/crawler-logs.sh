#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-1}"
PREFIX="/aws/lambda/HeadlessCrawlerStack"
START_TIME=$(( ($(date +%s) - 86400) * 1000 ))

groups=$(aws logs describe-log-groups \
  --log-group-name-prefix "$PREFIX" \
  --region "$REGION" \
  --query 'logGroups[].logGroupName' \
  --output text)

for group in $groups; do
  echo ""
  echo "=== $group ==="
  aws logs filter-log-events \
    --log-group-name "$group" \
    --region "$REGION" \
    --start-time "$START_TIME" \
    --filter-pattern "?ERROR ?Error ?error ?TimeoutError ?Exception" \
    --query 'events[].message' \
    --output text \
    || echo "(ログなし)"
done
