#!/usr/bin/env bash
set -euo pipefail
fn="${1:?usage: check-lambda.sh <function-name>}"
aws lambda get-function \
  --function-name "$fn" \
  --region ap-northeast-1 \
  --output json \
  | jq --arg fn "$fn" '{name:("lambda:" + $fn), state:.Configuration.State, timeout:.Configuration.Timeout, lastModified:.Configuration.LastModified}'
