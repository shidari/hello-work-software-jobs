#!/usr/bin/env bash
# Usage: debug.sh <subcommand> [args...]
#   crawler  [jobNumber] [minutes]
#   api      [pattern]   [minutes]
#   frontend [pattern]   [since]
#   trace    <jobNumber> [minutes]
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"

sub="${1:-}"
shift || true

case "$sub" in
  crawler)  exec bash "$dir/debug-crawler.sh"  "$@" ;;
  api)      exec bash "$dir/debug-api.sh"      "$@" ;;
  frontend) exec bash "$dir/debug-frontend.sh" "$@" ;;
  trace)    exec bash "$dir/debug-trace.sh"    "$@" ;;
  ""|help|-h|--help)
    cat <<'EOF'
Usage: debug.sh <subcommand> [args...]

Subcommands:
  crawler  [jobNumber] [minutes=30]   CloudWatch Logs (job-detail-etl)
  api      [pattern]   [minutes=15]   Cloudflare Workers (job-store)
  frontend [pattern]   [since=1h]     Vercel Logs (frontend)
  trace    <jobNumber> [minutes=60]   Cross-platform trace

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
