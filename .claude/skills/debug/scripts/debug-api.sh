#!/usr/bin/env bash
# Usage: debug-api.sh [pattern] [minutes]
#   pattern: jq でフィルタする部分文字列（例: jobNumber、エラータグ）
#   minutes: tail を実行する時間（デフォルト: 1 = 1分間）
#
# 注意: wrangler tail はライブストリームのみ。
# 過去のログは Cloudflare ダッシュボード（Workers Logs）を参照。
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$dir/_check-auth.sh"
check_wrangler_auth

pattern="${1:-}"
minutes="${2:-1}"
worker="job-store"
api_dir="$(cd "$dir/../../../../apps/backend/api" && pwd)"

echo "=== Tailing $worker for ${minutes}m${pattern:+ (filter: $pattern)} ==="
echo "Hint: 履歴クエリは Cloudflare Dashboard > Workers > $worker > Logs を参照"
echo ""

if [ -n "$pattern" ]; then
  (cd "$api_dir" && timeout "${minutes}m" wrangler tail "$worker" --format json 2>/dev/null || true) \
    | jq -c "select(tostring | contains(\"$pattern\"))"
else
  (cd "$api_dir" && timeout "${minutes}m" wrangler tail "$worker" --format json 2>/dev/null || true) \
    | jq -c '.'
fi
