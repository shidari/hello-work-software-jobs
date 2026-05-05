#!/usr/bin/env bash
set -euo pipefail

NAME=sho-sandbox

if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi

has_container() {
  container list ${1:-} 2>/dev/null | awk -v n="$NAME" 'NR>1 && $1==n {f=1} END{exit !f}'
}

if ! has_container -a; then
  "$(dirname "${BASH_SOURCE[0]}")/sandbox-create.sh"
elif ! has_container; then
  container start "$NAME"
fi

exec container exec -it -w /work "$NAME" bash
