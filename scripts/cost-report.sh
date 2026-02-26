#!/bin/bash
# 今月のAWSコストをサービス別に表示
set -euo pipefail

START=$(date -u +%Y-%m-01)
END=$(date -u +%Y-%m-%d)

echo "=== AWS Cost Report ($START ~ $END) ==="
aws ce get-cost-and-usage \
  --time-period "Start=$START,End=$END" \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output json \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for period in data['ResultsByTime']:
    print(f\"Period: {period['TimePeriod']['Start']} ~ {period['TimePeriod']['End']}\")
    total = 0
    for g in sorted(period['Groups'], key=lambda x: -float(x['Metrics']['BlendedCost']['Amount'])):
        amt = float(g['Metrics']['BlendedCost']['Amount'])
        if amt > 0:
            print(f\"  {g['Keys'][0]:40s} \${amt:.4f}\")
            total += amt
    print(f\"  {'TOTAL':40s} \${total:.4f}\")
"
