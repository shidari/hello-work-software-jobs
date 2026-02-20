#!/usr/bin/env bash
set -euo pipefail

# 求人番号抽出クローラーを手動実行し、ログをリアルタイムで表示する
# 使い方: devbox run invoke:crawler

REGION="${AWS_REGION:-ap-northeast-1}"

FUNC=$(aws lambda list-functions \
  --region "$REGION" \
  --query "Functions[?contains(FunctionName, 'HeadlessCrawlerStack') && contains(FunctionName, 'JobNumberExtractor')].FunctionName" \
  --output text)

if [ -z "$FUNC" ]; then
  echo "求人番号抽出 Lambda が見つかりません" >&2
  exit 1
fi

LOG_GROUP="/aws/lambda/$FUNC"

echo "=== 求人番号抽出クローラー実行 ==="
echo "関数: $FUNC"
echo ""

# Lambda を非同期で実行
TMPFILE=$(mktemp)
aws lambda invoke \
  --function-name "$FUNC" \
  --region "$REGION" \
  --payload '{"debugLog": true}' \
  --cli-binary-format raw-in-base64-out \
  --log-type Tail \
  "$TMPFILE" > /dev/null 2>&1 &
LAMBDA_PID=$!

# ログをリアルタイムで tail
echo "=== ログ出力 ==="
aws logs tail "$LOG_GROUP" \
  --region "$REGION" \
  --follow \
  --since 1m \
  --format short &
TAIL_PID=$!

# Lambda 完了を待つ
wait "$LAMBDA_PID"
EXIT_CODE=$?

# 少し待ってから tail を停止（最後のログが流れるのを待つ）
sleep 5
kill "$TAIL_PID" 2>/dev/null || true

echo ""
echo "=== 実行結果 ==="
cat "$TMPFILE"
rm -f "$TMPFILE"

echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "成功"
else
  echo "失敗 (exit code: $EXIT_CODE)"
fi
