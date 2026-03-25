#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
{
  bash "$dir/check-eventbridge.sh"
  bash "$dir/check-lambda.sh" job-number-crawler
  bash "$dir/check-lambda.sh" job-detail-etl
  bash "$dir/check-sqs.sh"
} | jq -s '{checks: .}'
