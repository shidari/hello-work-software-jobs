#!/usr/bin/env bash
# Shared auth check helpers. Source this file.
set -euo pipefail

check_aws_auth() {
  if [ -z "${AWS_PROFILE:-}" ]; then
    echo "ERROR: AWS_PROFILE is not set. Expected: AWS_PROFILE=crawler-debug" >&2
    return 1
  fi
  if ! aws sts get-caller-identity --output json >/dev/null 2>&1; then
    echo "ERROR: AWS auth failed for profile '$AWS_PROFILE'." >&2
    echo "Hint: aws sso login --profile $AWS_PROFILE" >&2
    return 1
  fi
}

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
