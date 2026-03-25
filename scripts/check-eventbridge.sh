#!/usr/bin/env bash
set -euo pipefail
aws events describe-rule \
  --name collector-weekday-cron \
  --region ap-northeast-1 \
  --output json \
  | jq '{name:"eventbridge", state:.State, schedule:.ScheduleExpression}'
