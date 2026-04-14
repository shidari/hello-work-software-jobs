#!/usr/bin/env bash
# Usage: debug-frontend.sh [pattern] [since]
#   pattern: grep で絞り込む部分文字列（例: jobNumber、URL）
#   since:   vercel logs --since 形式（例: 1h, 30m, 2d）デフォルト: 1h
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$dir/_check-auth.sh"
check_vercel_auth

pattern="${1:-}"
since="${2:-1h}"
fe_dir="$(cd "$dir/../../../../apps/frontend/hello-work-job-searcher" && pwd)"

echo "=== Vercel logs (since=$since${pattern:+, filter=$pattern}) ==="

if [ -n "$pattern" ]; then
  (cd "$fe_dir" && vercel logs --since "$since" 2>/dev/null) | grep -F "$pattern" || {
    echo "(no matches)"
  }
else
  (cd "$fe_dir" && vercel logs --since "$since" 2>/dev/null)
fi
