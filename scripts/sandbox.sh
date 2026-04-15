#!/usr/bin/env bash
set -euo pipefail

NAME=sho-sandbox

if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi

if ! container list -a --format json | jq -e --arg n "$NAME" '.[] | select(.configuration.id == $n)' >/dev/null 2>&1; then
  echo "ERROR: container '$NAME' not found. Run ./scripts/sandbox-create.sh first." >&2
  exit 1
fi

if ! container list --format json | jq -e --arg n "$NAME" '.[] | select(.configuration.id == $n)' >/dev/null 2>&1; then
  container start "$NAME"
fi

exec container exec -it -w /work "$NAME" bash
