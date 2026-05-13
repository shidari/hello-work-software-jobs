#!/usr/bin/env bash
# Usage: debug.sh <subcommand> [args...]
#   api      [pattern]   [minutes]
#   frontend [pattern]   [since]
#   trace    <jobNumber> [minutes]
#
# crawler (CloudWatch Logs) は ops MCP 経由に移行済み。
# SKILL.md の「Crawler (CloudWatch via MCP)」節を参照。
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"

sub="${1:-}"
shift || true

case "$sub" in
  crawler)
    cat >&2 <<'EOF'
NOTE: crawler ログは ops MCP 経由で取得する（dev sandbox から awscli を撤去した
ため bash スクリプトでは提供しない）。SKILL.md の「Crawler (CloudWatch via MCP)」
節に従い、`ops-aws-cloudwatch` の execute_log_insights_query を呼ぶこと。
EOF
    exit 2
    ;;
  api)      exec bash "$dir/debug-api.sh"      "$@" ;;
  frontend) exec bash "$dir/debug-frontend.sh" "$@" ;;
  trace)    exec bash "$dir/debug-trace.sh"    "$@" ;;
  ""|help|-h|--help)
    cat <<'EOF'
Usage: debug.sh <subcommand> [args...]

Subcommands:
  crawler                              ops MCP (ops-aws-cloudwatch) に誘導
  api      [pattern]   [minutes=15]    Cloudflare Workers (job-store)
  frontend [pattern]   [since=1h]      Vercel Logs (frontend)
  trace    <jobNumber> [minutes=60]    crawler 部は MCP、API/Frontend は CLI

See .claude/skills/debug/SKILL.md for details.
EOF
    exit 0
    ;;
  *)
    echo "ERROR: unknown subcommand: $sub" >&2
    echo "Run 'debug.sh help' for usage." >&2
    exit 2
    ;;
esac
