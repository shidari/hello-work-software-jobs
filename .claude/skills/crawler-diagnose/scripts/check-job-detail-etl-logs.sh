#!/usr/bin/env bash
# Usage: check-job-detail-etl-logs.sh [minutes_ago]
#   minutes_ago: 何分前から（デフォルト: 30）
set -euo pipefail
minutes="${1:-30}"
start_time=$(date -v-"${minutes}"M +%s000 2>/dev/null || date -d "${minutes} minutes ago" +%s000)

raw=$(aws logs filter-log-events \
  --log-group-name /aws/lambda/job-detail-etl \
  --start-time "$start_time" \
  --filter-pattern "ERROR" \
  --region ap-northeast-1 \
  --output json)

echo "=== Error distribution ==="
echo "$raw" | jq '[.events[].message | split("\t") | last | rtrimstr("\n") | fromjson? | .errorMessage // empty | capture("(?<tag>\\w+Error):") | .tag] | group_by(.) | map({error: .[0], count: length}) | sort_by(-.count)'

echo ""
echo "=== Recent errors ==="
echo "$raw" | jq '[.events[] | {timestamp: (.timestamp / 1000 | todate), message: (.message | split("\t") | last | rtrimstr("\n"))}] | .[-1]'
