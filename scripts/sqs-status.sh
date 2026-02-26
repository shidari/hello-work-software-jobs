#!/bin/bash
# SQSキューの状態を表示
set -euo pipefail

QUEUE_URL="https://sqs.ap-northeast-1.amazonaws.com/370519913758/HeadlessCrawlerStack-ToJobDetailExtractThenTransformThenLoadQueue73-jGilAAiBwqV5"

echo "=== SQS Queue Status ==="
aws sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names All \
  --output json \
  | python3 -c "
import json, sys
attrs = json.load(sys.stdin)['Attributes']
print(f\"Messages:    {attrs['ApproximateNumberOfMessages']}\")
print(f\"NotVisible:  {attrs['ApproximateNumberOfMessagesNotVisible']}\")
print(f\"Delayed:     {attrs['ApproximateNumberOfMessagesDelayed']}\")
print(f\"Visibility:  {attrs['VisibilityTimeout']}s\")
print(f\"Retention:   {int(attrs['MessageRetentionPeriod'])//86400}d\")
"
