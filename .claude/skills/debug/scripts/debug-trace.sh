#!/usr/bin/env bash
# Usage: debug-trace.sh <jobNumber> [minutes]
#   jobNumber: 求人番号（必須）
#   minutes:   何分前から（デフォルト: 60）
#
# 3 基盤を jobNumber で串刺し検索し、時系列にまとめる。
# 前提: docs/LOGGING.md のキー名規約に従って jobNumber が構造化ログに含まれていること。
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"

job_number="${1:-}"
minutes="${2:-60}"

if [ -z "$job_number" ]; then
  echo "ERROR: jobNumber is required" >&2
  echo "Usage: debug-trace.sh <jobNumber> [minutes]" >&2
  exit 2
fi

echo "############################################################"
echo "# Trace for jobNumber=$job_number (last ${minutes}m)"
echo "############################################################"
echo ""

echo "##### [1/3] Crawler (CloudWatch via MCP) #####"
cat <<EOF
NOTE: crawler ログは ops MCP 経由で取得する（dev sandbox に awscli は無い）。
SKILL.md の「Crawler (CloudWatch via MCP)」節に従い、
ops-aws-cloudwatch の execute_log_insights_query を以下クエリで呼ぶ:

  log-group:  /aws/lambda/job-detail-etl
  range:      ${minutes} minutes
  query:
    fields @timestamp, @message
    | filter @message like /${job_number}/
    | sort @timestamp desc
    | limit 200
EOF
echo ""

echo "##### [2/3] API (Workers) #####"
echo "Note: wrangler tail はライブのみ。jobNumber=$job_number の履歴は"
echo "Cloudflare Dashboard > Workers > job-store > Logs で検索してください。"
echo ""

echo "##### [3/3] Frontend (Vercel) #####"
# vercel logs の since は h/m/d 単位
if [ "$minutes" -ge 60 ]; then
  since="$((minutes / 60))h"
else
  since="${minutes}m"
fi
bash "$dir/debug-frontend.sh" "$job_number" "$since" || echo "(frontend check failed; see error above)"
