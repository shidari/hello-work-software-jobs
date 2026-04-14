#!/usr/bin/env bash
# Usage: debug-crawler.sh [jobNumber] [minutes_ago]
#   jobNumber:   求人番号（指定時はこれを含むログのみ）
#   minutes_ago: 何分前から（デフォルト: 30）
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$dir/_check-auth.sh"
check_aws_auth

job_number="${1:-}"
minutes="${2:-30}"
start_time=$(date -v-"${minutes}"M +%s000 2>/dev/null || date -d "${minutes} minutes ago" +%s000)

filter_pattern="ERROR"
if [ -n "$job_number" ]; then
  filter_pattern="\"$job_number\""
fi

raw=$(aws logs filter-log-events \
  --log-group-name /aws/lambda/job-detail-etl \
  --start-time "$start_time" \
  --filter-pattern "$filter_pattern" \
  --region ap-northeast-1 \
  --output json)

count=$(echo "$raw" | jq '.events | length')
echo "=== Hits: $count (last ${minutes}m${job_number:+, jobNumber=$job_number}) ==="

if [ "$count" -eq 0 ]; then
  exit 0
fi

echo ""
echo "=== Error tag distribution ==="
echo "$raw" | jq '
  [.events[].message
    | split("\t") | last | rtrimstr("\n")
    | fromjson? | .errorMessage // empty
    | capture("(?<tag>\\w+Error):")? | .tag]
  | map(select(. != null))
  | group_by(.) | map({error: .[0], count: length})
  | sort_by(-.count)
'

echo ""
echo "=== Recent events (up to 10) ==="
echo "$raw" | jq '
  [.events[] | {
    timestamp: (.timestamp / 1000 | todate),
    message: (.message | split("\t") | last | rtrimstr("\n"))
  }] | .[-10:]
'
