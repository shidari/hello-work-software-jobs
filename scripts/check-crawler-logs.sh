#!/usr/bin/env bash
set -euo pipefail
days="${1:-3}"
start_time=$(date -v-"${days}"d +%s000 2>/dev/null || date -d "${days} days ago" +%s000)
aws logs filter-log-events \
  --log-group-name /aws/lambda/job-number-crawler \
  --start-time "$start_time" \
  --filter-pattern "ERROR" \
  --region ap-northeast-1 \
  --output json \
  | jq '[.events[] | {timestamp: (.timestamp / 1000 | todate), message: (.message | split("\t") | last | rtrimstr("\n"))}]'
