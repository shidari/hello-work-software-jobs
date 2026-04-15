#!/usr/bin/env bash
set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
IMAGE=sho-sandbox
NAME=sho-sandbox

if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi

if container list -a --format json | jq -e --arg n "$NAME" '.[] | select(.configuration.id == $n)' >/dev/null 2>&1; then
  echo "ERROR: container '$NAME' already exists. Run ./scripts/sandbox-stop.sh first." >&2
  exit 1
fi

container build -t "$IMAGE" "$REPO"

GIT_NAME=$(git -C "$REPO" config --get user.name || echo "Sandbox")
GIT_EMAIL=$(git -C "$REPO" config --get user.email || echo "sandbox@localhost")

# Mount policy:
#   - repo: read-write (working directory)
#   - ~/.aws: read-only (SSO cache is filesystem-based; `aws sso login` runs on host)
#   - ~/.sho-sandbox/*: read-write, isolated from host creds. Web-based `login`
#     subcommands run inside the container and persist auth here across restarts.
STATE="$HOME/.sho-sandbox"
mkdir -p \
  "$STATE/wrangler" \
  "$STATE/vercel-data" \
  "$STATE/vercel-config" \
  "$STATE/gh" \
  "$STATE/claude"

MOUNTS=(
  -v "$REPO:/work"
  -v "$STATE/wrangler:/home/node/.config/.wrangler"
  -v "$STATE/vercel-data:/home/node/.local/share/com.vercel.cli"
  -v "$STATE/vercel-config:/home/node/.config/com.vercel.cli"
  -v "$STATE/gh:/home/node/.config/gh"
  -v "$STATE/claude:/home/node/.claude"
)
[[ -e "$HOME/.aws" ]] && MOUNTS+=( -v "$HOME/.aws:/home/node/.aws:ro" )

container run -d --name "$NAME" \
  "${MOUNTS[@]}" \
  -e GIT_AUTHOR_NAME="$GIT_NAME" \
  -e GIT_AUTHOR_EMAIL="$GIT_EMAIL" \
  -e GIT_COMMITTER_NAME="$GIT_NAME" \
  -e GIT_COMMITTER_EMAIL="$GIT_EMAIL" \
  -w /work \
  "$IMAGE" \
  sleep infinity
