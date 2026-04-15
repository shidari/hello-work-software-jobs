#!/usr/bin/env bash
set -euo pipefail

NAME=sho-sandbox

if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi

container stop "$NAME" 2>/dev/null || true
container rm "$NAME" 2>/dev/null || true
