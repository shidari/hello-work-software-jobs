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
# Same pattern: does the existing container have the claude-permissions overlay
# mount? Used to warn upgraders since MOUNTS are only applied on container
# creation, not on start.
container_has_permissions_overlay() {
  container inspect "$NAME" 2>/dev/null | grep -q "claude-permissions"
}

if ! has_image; then
  echo "ERROR: ${IMAGE} not loaded." >&2
  echo "       Build & load with: ./scripts/sandbox-image.sh" >&2
  exit 1
fi

# Sandbox state lives under ~/.sho-sandbox/ on the host. Each subdir is bind-mounted
# into the container so Claude / VSCode-server state survives container recreation.
# 認証情報を抱える CLI (gh / wrangler / vercel / awscli) は sandbox から撤去し、
# 対応する `~/.sho-sandbox/{gh,wrangler,vercel*}` の bind-mount も廃止した。これら
# はホスト側の標準 path (`~/.config/gh/` 等) を直接使う。
# Mount targets follow image HOME=/root (flake.nix). Apple container runs the
# image as its declared user (root), so /root/... is the actual runtime HOME.
STATE="$HOME/.sho-sandbox"
mkdir -p \
  "$STATE/claude" \
  "$STATE/vscode-server"

# host と container で project-level の Claude permissions を分離するための準備。
#
# 背景: Apple container CLI 0.11.0 の virtiofs は **file-level bind mount** が
# 機能しない (stat は通るが open(2) が EACCES)。なので「.claude/settings.local.json
# だけ container 内で別実体に差し替える」が直接は出来ない。
#
# 解: settings 実体をサブディレクトリ .claude/permissions/ に逃がし、
# .claude/settings.local.json はそこへの相対 symlink にする。サブディレクトリは
# **directory-level bind mount** で container 内だけ別実体に差し替える (これは動く)。
# host は permissions/ の実ファイルを読み、container は overlay の空 {} を読む。
# container は project-level を空として扱い、自分の allow は user-level
# (/root/.claude/settings.json = ~/.sho-sandbox/claude/settings.json) に蓄積する。
PERMISSIONS_OVERLAY_DIR="$STATE/claude-permissions"
PERMISSIONS_HOST_DIR="$REPO/.claude/permissions"
PERMISSIONS_FILENAME="settings.local.json"
mkdir -p "$PERMISSIONS_OVERLAY_DIR"
[[ -f "$PERMISSIONS_OVERLAY_DIR/$PERMISSIONS_FILENAME" ]] || echo '{}' > "$PERMISSIONS_OVERLAY_DIR/$PERMISSIONS_FILENAME"

# main repo の .claude/settings.local.json を以下の状態に揃える:
#   - permissions/settings.local.json (regular file)  ← 中身がここに入る
#   - settings.local.json (relative symlink → permissions/settings.local.json)
# 既に regular file ならその中身を保ったまま permissions/ に mv して symlink に置換する。
# 既に symlink なら何もしない (idempotent)。
MAIN_SETTINGS="$REPO/.claude/$PERMISSIONS_FILENAME"
MAIN_PERMISSIONS_FILE="$PERMISSIONS_HOST_DIR/$PERMISSIONS_FILENAME"
mkdir -p "$PERMISSIONS_HOST_DIR"
if [[ -f "$MAIN_SETTINGS" && ! -L "$MAIN_SETTINGS" ]]; then
  if [[ -e "$MAIN_PERMISSIONS_FILE" ]]; then
    # Both exist — could happen if a stale or hook-bootstrapped permissions file
    # is sitting next to an unmigrated regular settings file. Don't pick a side
    # automatically (either could contain the user's real allow list). Abort to
    # force the user to resolve before launching the container; otherwise the
    # container would silently see the host's regular allow list through the
    # repo bind mount, defeating the whole isolation point.
    echo "[sandbox] ERROR: both $MAIN_SETTINGS and $MAIN_PERMISSIONS_FILE exist." >&2
    echo "                Aborting before container start to avoid leaking host's" >&2
    echo "                project-level allow list into the container." >&2
    echo "                Inspect both, remove the stale one, then re-run sandbox.sh:" >&2
    echo "                  diff $MAIN_SETTINGS $MAIN_PERMISSIONS_FILE" >&2
    exit 1
  fi
  mv "$MAIN_SETTINGS" "$MAIN_PERMISSIONS_FILE"
  ln -s "permissions/$PERMISSIONS_FILENAME" "$MAIN_SETTINGS"
elif [[ ! -e "$MAIN_SETTINGS" ]]; then
  [[ -f "$MAIN_PERMISSIONS_FILE" ]] || echo '{}' > "$MAIN_PERMISSIONS_FILE"
  ln -s "permissions/$PERMISSIONS_FILENAME" "$MAIN_SETTINGS"
fi

# 既存 worktree の .claude/settings.local.json は触らない (regular file は破壊しない方針)。
# 新規 worktree は EnterWorktree hook (.claude/hooks/link-worktree-settings.sh) が
# main の permissions/settings.local.json への絶対 symlink を張る。

# 実 AWS への到達経路は dev sandbox からは外した。awscli は flake.nix に
# 入れず、~/.aws の snapshot/mount も行わない。実 AWS の診断は ops container
# (sho-mcp-ops) 側に閉じた awslabs.aws-api-mcp-server / cloudwatch-mcp-server
# 経由で行う。LocalStack は docker compose の `localstack` service に同梱
# されている awslocal を `docker compose exec` 経由で叩く。

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

# Same shape, but security-critical so we ABORT instead of just warning: if the
# container was created before the claude-permissions overlay mount was
# introduced, MOUNTS were never applied with it. Existing containers would
# silently expose host's project-level allow list through the repo bind mount,
# defeating the host/container split. Force the user to recreate before we
# launch any further interaction.
if has_container -a && ! container_has_permissions_overlay; then
  echo "[sandbox] ERROR: ${NAME} lacks the claude-permissions overlay mount." >&2
  echo "                Without it, host's project-level allow list would leak" >&2
  echo "                into the container. Aborting before any container exec." >&2
  echo "                Recreate to apply:" >&2
  echo "                  ./scripts/sandbox-stop.sh && ./scripts/sandbox.sh" >&2
  exit 1
fi

if ! has_container -a; then
  GIT_NAME=$(git -C "$REPO" config --get user.name || echo "Sandbox")
  GIT_EMAIL=$(git -C "$REPO" config --get user.email || echo "sandbox@localhost")

  # claude-permissions overlay は --mount の長形式で readonly を明示する。
  # Apple container 0.11.0 では `-v src:dst:ro` の `:ro` が silently 落とされる
  # ため、長形式の `readonly` flag に乗せる必要がある。
  MOUNTS=(
    -v "$REPO:$REPO"
    --mount "type=bind,source=$PERMISSIONS_OVERLAY_DIR,target=$PERMISSIONS_HOST_DIR,readonly"
    -v "$STATE/claude:/root/.claude"
    -v "$STATE/vscode-server:/root/.vscode-server"
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
