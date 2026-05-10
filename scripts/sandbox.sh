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

# Sandbox state lives under ~/.sho-sandbox/ on the host. Each subdir is bind-mounted
# into the container so credential/IDE state survives container recreation.
# Mount targets follow image HOME=/root (flake.nix). Earlier we expected Apple
# container to remap the runtime user to `node` (UID 1000), but recent versions
# run the image as its declared user (root) — so /home/node/... mounts went
# unused and `gh login` etc. lost persistence. Sticking to /root keeps mounts
# aligned with the actual runtime HOME.
STATE="$HOME/.sho-sandbox"
mkdir -p \
  "$STATE/wrangler" \
  "$STATE/vercel-data" \
  "$STATE/vercel-config" \
  "$STATE/gh" \
  "$STATE/claude" \
  "$STATE/vscode-server" \
  "$STATE/aws"

# Snapshot host AWS profile defs into the sandbox (host = source of truth).
# Runs on every invocation so direnv picks up host config edits automatically.
# Container's AssumeRole / SSO cache ends up in $STATE/aws/{cli,sso}/cache/
# without ever writing back to host ~/.aws/.
if [[ -d "$HOME/.aws" ]]; then
  [[ -f "$HOME/.aws/config"      ]] && cp -p "$HOME/.aws/config"      "$STATE/aws/config"
  [[ -f "$HOME/.aws/credentials" ]] && cp -p "$HOME/.aws/credentials" "$STATE/aws/credentials"
fi

if ! has_container -a; then
  GIT_NAME=$(git -C "$REPO" config --get user.name || echo "Sandbox")
  GIT_EMAIL=$(git -C "$REPO" config --get user.email || echo "sandbox@localhost")

  MOUNTS=(
    -v "$REPO:/work"
    -v "$STATE/wrangler:/root/.config/.wrangler"
    -v "$STATE/vercel-data:/root/.local/share/com.vercel.cli"
    -v "$STATE/vercel-config:/root/.config/com.vercel.cli"
    -v "$STATE/gh:/root/.config/gh"
    -v "$STATE/claude:/root/.claude"
    -v "$STATE/vscode-server:/root/.vscode-server"
    -v "$STATE/aws:/root/.aws"
  )

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
