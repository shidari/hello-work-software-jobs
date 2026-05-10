#!/usr/bin/env bash
# Ensure the sho-sandbox container is up, then drop into a shell inside it.
#
# When called with --ensure-up, only ensures the container is running and
# exits (used by .envrc on `cd`). Without flags, opens an interactive shell.

set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAME=sho-sandbox
IMAGE=sho-sandbox:latest
ENSURE_UP_ONLY=0

[[ "${1-}" == "--ensure-up" ]] && ENSURE_UP_ONLY=1

if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi

has_image() {
  container image ls 2>/dev/null | awk 'NR>1 && $1=="sho-sandbox" {f=1} END{exit !f}'
}
has_container() {
  container list ${1:-} 2>/dev/null | awk -v n="$NAME" 'NR>1 && $1==n {f=1} END{exit !f}'
}

if ! has_image; then
  echo "ERROR: ${IMAGE} not loaded." >&2
  echo "       Build & load with: ./scripts/sandbox-image.sh" >&2
  exit 1
fi

if ! has_container -a; then
  GIT_NAME=$(git -C "$REPO" config --get user.name || echo "Sandbox")
  GIT_EMAIL=$(git -C "$REPO" config --get user.email || echo "sandbox@localhost")

  # Mount policy:
  #   - repo: read-write at /work
  #   - ~/.aws: read-only (SSO cache is host-side, `aws sso login` runs on host)
  #   - ~/.sho-sandbox/*: read-write, isolated from host creds
  STATE="$HOME/.sho-sandbox"
  mkdir -p \
    "$STATE/wrangler" \
    "$STATE/vercel-data" \
    "$STATE/vercel-config" \
    "$STATE/gh" \
    "$STATE/claude" \
    "$STATE/vscode-server"

  MOUNTS=(
    -v "$REPO:/work"
    -v "$STATE/wrangler:/root/.config/.wrangler"
    -v "$STATE/vercel-data:/root/.local/share/com.vercel.cli"
    -v "$STATE/vercel-config:/root/.config/com.vercel.cli"
    -v "$STATE/gh:/root/.config/gh"
    -v "$STATE/claude:/root/.claude"
    -v "$STATE/vscode-server:/root/.vscode-server"
  )
  [[ -e "$HOME/.aws" ]] && MOUNTS+=( -v "$HOME/.aws:/root/.aws:ro" )

  container run -d --name "$NAME" \
    -m 6g \
    "${MOUNTS[@]}" \
    -e GIT_AUTHOR_NAME="$GIT_NAME" \
    -e GIT_AUTHOR_EMAIL="$GIT_EMAIL" \
    -e GIT_COMMITTER_NAME="$GIT_NAME" \
    -e GIT_COMMITTER_EMAIL="$GIT_EMAIL" \
    -w /work \
    "$IMAGE" \
    sleep infinity >/dev/null
elif ! has_container; then
  container start "$NAME" >/dev/null
fi

(( ENSURE_UP_ONLY )) && exit 0

exec container exec -it -w /work "$NAME" /bin/bash
