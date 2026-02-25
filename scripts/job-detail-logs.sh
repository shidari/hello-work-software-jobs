#!/usr/bin/env bash
set -euo pipefail

# 求人詳細 ETL Lambda のログを確認する
# 使い方: devbox run logs:job-detail [時間(分)]
# 例:     devbox run logs:job-detail       # 直近30分
#         devbox run logs:job-detail 60     # 直近60分

MINUTES="${1:-30}"
REGION="${AWS_REGION:-ap-northeast-1}"

FUNC=$(aws lambda list-functions \
  --region "$REGION" \
  --query "Functions[?contains(FunctionName, 'HeadlessCrawlerStack') && contains(FunctionName, 'JobDetailExtractThenTransform')].FunctionName" \
  --output text)

if [ -z "$FUNC" ]; then
  echo "求人詳細 ETL Lambda が見つかりません" >&2
  exit 1
fi

LOG_GROUP="/aws/lambda/$FUNC"
START_TIME=$(( ($(date +%s) - MINUTES * 60) * 1000 ))

echo "=== 求人詳細 ETL デバッグ ==="
echo "関数: $FUNC"
echo "期間: 直近 ${MINUTES} 分"
echo ""

# 成功件数
echo "--- 成功 ---"
SUCCESS_COUNT=$(aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --region "$REGION" \
  --start-time "$START_TIME" \
  --filter-pattern "\"Lambda job succeeded\"" \
  --query 'length(events)' \
  --output text 2>/dev/null || echo "0")
echo "成功件数: $SUCCESS_COUNT"
echo ""

# 失敗件数とエラー内容
echo "--- 失敗 ---"
ERRORS=$(aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --region "$REGION" \
  --start-time "$START_TIME" \
  --filter-pattern "?\"Lambda job failed\" ?ERROR ?Error ?TimeoutError ?Task timed out" \
  --query 'events[].message' \
  --output text 2>/dev/null || echo "")

if [ -z "$ERRORS" ]; then
  echo "エラーなし"
else
  ERROR_COUNT=$(echo "$ERRORS" | wc -l | tr -d ' ')
  echo "エラー件数: $ERROR_COUNT"
  echo ""
  echo "--- エラー詳細 ---"
  echo "$ERRORS"
fi
