#!/usr/bin/env bash
# Ensure the sho-sandbox container is up, then drop into a shell inside it.
#
# When called with --ensure-up, only ensures the container is running and
# exits (used by .envrc on `cd`). Without flags, opens an interactive shell.

set -euo pipefail

# Resolve the *main* repo's host path even when this script is invoked from
# a git worktree. We mount that path into the container at the *same* host
# path, so worktree `.git` files (which contain absolute host paths like
# `gitdir: /Users/.../<repo>/.git/worktrees/<name>`) resolve correctly inside.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
if MAIN_GIT_DIR=$(git -C "$SCRIPT_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null); then
  REPO=$(dirname "$MAIN_GIT_DIR")
else
  REPO=$(cd "$SCRIPT_DIR/.." && pwd)
fi

NAME=sho-sandbox
IMAGE=sho-sandbox:latest
# Shared private network with the ops container (sho-mcp-ops). Dev sandbox
# joins it so Claude inside this container can reach MCP endpoints exposed
# by ops at sho-mcp-ops:7001 / :7002. Network is idempotently created here
# and again in scripts/ops-sandbox.sh — whoever boots first wins.
NETWORK=sho-mcp-net
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
has_network() {
  container network ls 2>/dev/null | awk -v n="$NETWORK" 'NR>1 && $1==n {f=1} END{exit !f}'
}
# Best-effort check: existing container's stored config mentions NETWORK.
# Grepping inspect output without parsing JSON is brittle but conservative —
# a false negative just produces a warning (not an error), and the real fix
# is "recreate the container".
container_on_network() {
  container inspect "$NAME" 2>/dev/null | grep -q "$NETWORK"
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

if ! has_network; then
  echo "[sandbox] creating network ${NETWORK}"
  container network create "$NETWORK" >/dev/null
fi

# Migration warning: if the container was created before sho-mcp-net was
# introduced, --network was never applied. Apple container doesn't expose a
# safe "attach existing container to network" path here, so the only fix is
# to recreate. Warn explicitly instead of silently leaving MCP unreachable.
if has_container -a && ! container_on_network; then
  echo "[sandbox] WARN: ${NAME} is not on ${NETWORK}." >&2
  echo "             MCP servers in sho-mcp-ops will be unreachable from this container." >&2
  echo "             Recreate to attach: ./scripts/sandbox-stop.sh && ./scripts/sandbox.sh" >&2
fi

if ! has_container -a; then
  GIT_NAME=$(git -C "$REPO" config --get user.name || echo "Sandbox")
  GIT_EMAIL=$(git -C "$REPO" config --get user.email || echo "sandbox@localhost")

  MOUNTS=(
    -v "$REPO:$REPO"
    -v "$STATE/wrangler:/root/.config/.wrangler"
    -v "$STATE/vercel-data:/root/.local/share/com.vercel.cli"
    -v "$STATE/vercel-config:/root/.config/com.vercel.cli"
    -v "$STATE/gh:/root/.config/gh"
    -v "$STATE/claude:/root/.claude"
    -v "$STATE/vscode-server:/root/.vscode-server"
    -v "$STATE/aws:/root/.aws"
  )

  container run -d --name "$NAME" \
    --network "$NETWORK" \
    -m 6g \
    "${MOUNTS[@]}" \
    -e GIT_AUTHOR_NAME="$GIT_NAME" \
    -e GIT_AUTHOR_EMAIL="$GIT_EMAIL" \
    -e GIT_COMMITTER_NAME="$GIT_NAME" \
    -e GIT_COMMITTER_EMAIL="$GIT_EMAIL" \
    -w "$REPO" \
    "$IMAGE" \
    sleep infinity >/dev/null
elif ! has_container; then
  container start "$NAME" >/dev/null
fi

# /work は image の PATH (=/work/node_modules/.bin) と既存 docs に baked
# されているので、$REPO への symlink として常に提供する。container 起動
# 直後に張り直すので、bind mount の先（worktree path 等）が変わっても追従
# する。
container exec "$NAME" /bin/bash -c "rm -rf /work && ln -sfT '$REPO' /work" >/dev/null

# Apple container builtin DNS は sho-mcp-net 上の hostname を resolve しない
# (CLI 0.11.0 時点)。同 network 上の sho-mcp-ops は IP は固定だが container を
# 作り直すと変わるので、起動時に毎回引き直して /etc/hosts に書き込む (idempotent)。
# ops が存在しない / 別 network の場合は skip — MCP は使わない開発でも壊さない。
if container list -a 2>/dev/null | awk 'NR>1 && $1=="sho-mcp-ops"' | grep -q .; then
  OPS_IP=$(container inspect sho-mcp-ops 2>/dev/null | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)[0]
  for n in d.get('networks', []):
    if n.get('network') == '$NETWORK':
      print(n['ipv4Address'].split('/')[0])
      break
except Exception:
  pass
" 2>/dev/null)
  if [[ -n "$OPS_IP" ]]; then
    container exec "$NAME" /bin/bash -c "
      grep -v '[[:space:]]sho-mcp-ops\$' /etc/hosts > /tmp/.hosts.new 2>/dev/null || true
      echo '$OPS_IP sho-mcp-ops' >> /tmp/.hosts.new
      cat /tmp/.hosts.new > /etc/hosts
      rm -f /tmp/.hosts.new
    " >/dev/null
    echo "[sandbox] /etc/hosts: sho-mcp-ops -> $OPS_IP"
  fi
fi

(( ENSURE_UP_ONLY )) && exit 0

exec container exec -it -w "$REPO" "$NAME" /bin/bash
