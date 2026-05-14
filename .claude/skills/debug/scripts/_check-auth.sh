#!/usr/bin/env bash
# Shared auth check helpers. Source this file.
#
# AWS auth は ops container 側で完結するため dev sandbox からはチェックしない。
# crawler 系の CloudWatch クエリは ops-aws-cloudwatch MCP server 経由で行い、
# 認証エラーは MCP のレスポンスでハンドルする。
set -euo pipefail

check_wrangler_auth() {
  if ! command -v wrangler >/dev/null 2>&1; then
    echo "ERROR: wrangler not found. Enter sandbox: './scripts/sandbox.sh'" >&2
    return 1
  fi
  if ! wrangler whoami >/dev/null 2>&1; then
    echo "ERROR: wrangler not authenticated." >&2
    echo "Hint: wrangler login" >&2
    return 1
  fi
}

check_vercel_auth() {
  if ! command -v vercel >/dev/null 2>&1; then
    echo "ERROR: vercel CLI not found. Enter sandbox: './scripts/sandbox.sh'" >&2
    return 1
  fi
  if ! vercel whoami >/dev/null 2>&1; then
    echo "ERROR: vercel not authenticated." >&2
    echo "Hint: vercel login" >&2
    return 1
  fi
}
