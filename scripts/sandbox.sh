#!/usr/bin/env bash
set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
IMAGE=sho-sandbox
NAME=sho-sandbox
ENV_FILE="$REPO/.env.sandbox"

if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi

sub="${1:-claude}"

if [[ "$sub" == "stop" ]]; then
  container stop "$NAME" 2>/dev/null || true
  container rm "$NAME" 2>/dev/null || true
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  echo "Copy .env.sandbox.example to .env.sandbox and fill in the tokens." >&2
  exit 1
fi

container build -t "$IMAGE" "$REPO"

GIT_NAME=$(git -C "$REPO" config --get user.name || echo "Sandbox")
GIT_EMAIL=$(git -C "$REPO" config --get user.email || echo "sandbox@localhost")

# Mount policy:
#   - repo: read-write (working directory)
#   - ~/.aws: read-only (SSO cache is filesystem-based; `aws sso login` runs on host)
#   - all other credentials (GitHub / Cloudflare / Vercel / Claude) are passed as
#     env vars via .env.sandbox to keep blast radius narrow.
MOUNTS=( -v "$REPO:/work" )
[[ -e "$HOME/.aws" ]] && MOUNTS+=( -v "$HOME/.aws:/home/node/.aws:ro" )

if ! container list -a --format json | jq -e --arg n "$NAME" '.[] | select(.name == $n)' >/dev/null 2>&1; then
  container run -d --name "$NAME" \
    "${MOUNTS[@]}" \
    --env-file "$ENV_FILE" \
    -e GIT_AUTHOR_NAME="$GIT_NAME" \
    -e GIT_AUTHOR_EMAIL="$GIT_EMAIL" \
    -e GIT_COMMITTER_NAME="$GIT_NAME" \
    -e GIT_COMMITTER_EMAIL="$GIT_EMAIL" \
    -w /work \
    "$IMAGE" \
    sleep infinity
fi

case "$sub" in
  claude)
    exec container exec -it -w /work "$NAME" claude "${@:2}"
    ;;
  shell)
    exec container exec -it -w /work "$NAME" bash
    ;;
  *)
    # forward arbitrary command: ./scripts/sandbox.sh <cmd> [args...]
    exec container exec -it -w /work "$NAME" "$@"
    ;;
esac
