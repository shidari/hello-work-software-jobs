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
# Same pattern: ssh-agent forwarding mount (for git commit signing). MOUNTS
# only apply on container creation, so existing containers without this mount
# must be recreated to pick it up.
container_has_ssh_agent_mount() {
  container inspect "$NAME" 2>/dev/null | grep -q "/run/ssh-agent.sock"
}
# host の SSH_AUTH_SOCK path は launchd 管理で session 毎に変わる
# (例: /var/run/com.apple.launchd.XXX/Listeners)。container 作成時の path が
# host 現在の SSH_AUTH_SOCK と一致しているか確認する。ずれていたら
# bind mount 先の socket は既に消滅していて signing が動かないので recreate を促す。
container_ssh_agent_source_matches() {
  [[ -z "${SSH_AUTH_SOCK:-}" ]] && return 0
  container inspect "$NAME" 2>/dev/null | grep -q "\"source\" *: *\"${SSH_AUTH_SOCK}\""
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

# SSH-agent forwarding + 公開鍵 expose の準備。
#
# 目的: container 内で git commit -S が動くようにする。host の launchd が管理する
# ssh-agent socket (SSH_AUTH_SOCK) を container に bind mount し、host の Keychain
# 経由で既に unlocked になっている署名鍵 (~/.ssh/github_ed25519) を agent 越しに
# 使わせる。秘密鍵そのものは container には決して置かない。
#
# 公開鍵は gitconfig の `user.signingkey = ~/.ssh/github_ed25519.pub` が path で
# 参照しているので、host の .pub を $STATE/ssh/ に staging copy して /root/.ssh/
# に read-only mount する。known_hosts も併せて staging copy する (ssh-keygen -Y
# sign 自体は known_hosts を読まないが、container 内で他の SSH を打つ場合の最低限
# として持たせておく)。
#
# セキュリティトレードオフ: agent forwarding は host agent に load された **全鍵**
# を container 側コードから利用可能にする。host で `ssh-add -L` に並ぶ鍵がそのまま
# container にも見える点に注意。dev sandbox の信頼境界に含まれる前提で許容している。
SSH_STAGING_DIR="$STATE/ssh"
mkdir -p "$SSH_STAGING_DIR"
chmod 700 "$SSH_STAGING_DIR"
SSH_PUB_SRC="$HOME/.ssh/github_ed25519.pub"
SSH_KNOWN_HOSTS_SRC="$HOME/.ssh/known_hosts"
# 同期: host source が消えたら staging copy も消す (consume されないと、SIGNING_ENABLED
# の判定で staged copy だけが残って "signing 可" と誤判定する)。
if [[ -f "$SSH_PUB_SRC" ]]; then
  cp -f "$SSH_PUB_SRC" "$SSH_STAGING_DIR/github_ed25519.pub"
  chmod 644 "$SSH_STAGING_DIR/github_ed25519.pub"
else
  rm -f "$SSH_STAGING_DIR/github_ed25519.pub"
fi
if [[ -f "$SSH_KNOWN_HOSTS_SRC" ]]; then
  cp -f "$SSH_KNOWN_HOSTS_SRC" "$SSH_STAGING_DIR/known_hosts"
  chmod 644 "$SSH_STAGING_DIR/known_hosts"
else
  rm -f "$SSH_STAGING_DIR/known_hosts"
fi

# allowed_signers (git の SSH 署名検証用 — verify 時のみ参照、sign 時は不要だが
# `git log --show-signature` 等のために container にも置いておく) を staging copy。
# host の ~/.config/git/allowed_signers を staging dir 経由で /root/.config/git/
# に read-only mount する (file-level mount は doc 上 unreliable なので dir mount)。
GIT_CONFIG_STAGING_DIR="$STATE/git-config"
mkdir -p "$GIT_CONFIG_STAGING_DIR"
GIT_ALLOWED_SIGNERS_SRC="$HOME/.config/git/allowed_signers"
if [[ -f "$GIT_ALLOWED_SIGNERS_SRC" ]]; then
  cp -f "$GIT_ALLOWED_SIGNERS_SRC" "$GIT_CONFIG_STAGING_DIR/allowed_signers"
  chmod 644 "$GIT_CONFIG_STAGING_DIR/allowed_signers"
else
  rm -f "$GIT_CONFIG_STAGING_DIR/allowed_signers"
fi

# host SSH_AUTH_SOCK が無い (CI / 非対話セッション等) 場合は agent forwarding を
# skip。container 内で signing が必要になったら user に再 login を促す。
# SIGNING_ENABLED は後段の git config 書き込みで commit.gpgsign を有効化するか
# 判別する。forwarding が無いまま commit.gpgsign=true にすると通常の `git commit`
# まで失敗するので、**実際に running container が agent forwarding を使える時のみ**
# signing を強制し、それ以外では明示的に unset する。
# - 新規 container を作る場合: 現在の SSH_AUTH_SOCK / 公開鍵が揃えば OK
# - 既存 container がいる場合: その container の mount が現行 SSH_AUTH_SOCK に
#   一致している必要がある (mount は作成時固定、host re-login で source が ずれた
#   ものは使えない)
# pub key が host agent に load 済みかも確認する。socket だけあって鍵が load
# されていない状態 (host reboot 直後で keychain 未起動 / 違う鍵だけ load 済み
# 等) で commit.gpgsign=true にすると、普通の `git commit` が "no usable private
# key" で fail する。鍵 type + base64 (公開鍵ファイルの 2 列目まで) で identity
# 一致を見る。
key_in_agent() {
  [[ -f "$SSH_PUB_SRC" ]] || return 1
  command -v ssh-add >/dev/null 2>&1 || return 1
  local want
  want=$(awk '{print $1, $2}' "$SSH_PUB_SRC" 2>/dev/null)
  [[ -n "$want" ]] || return 1
  ssh-add -L 2>/dev/null | awk '{print $1, $2}' | grep -qxF "$want"
}

SSH_AGENT_MOUNT=()
SSH_AGENT_ENV=()
SIGNING_ENABLED=0
if [[ -n "${SSH_AUTH_SOCK:-}" && -S "${SSH_AUTH_SOCK:-}" && -f "$SSH_STAGING_DIR/github_ed25519.pub" ]] && key_in_agent; then
  SSH_AGENT_MOUNT=(-v "$SSH_AUTH_SOCK:/run/ssh-agent.sock")
  SSH_AGENT_ENV=(-e "SSH_AUTH_SOCK=/run/ssh-agent.sock")
  if ! has_container -a; then
    SIGNING_ENABLED=1
  elif container_has_ssh_agent_mount && container_ssh_agent_source_matches; then
    SIGNING_ENABLED=1
  fi
fi
if (( ! SIGNING_ENABLED )); then
  echo "[sandbox] WARN: container 内で git commit -S は無効化する (forwarding 不可 / 鍵 unload / mount 不一致)。" >&2
fi

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

# Migration warning: ssh-agent forwarding は MOUNTS の一部なので container 作成時
# しか効かない。既存 container にこの mount が無ければ git commit -S が動かない。
# また host SSH_AUTH_SOCK は session ごとに path が変わるので、host 側 reboot 後
# は container 作成時の source path が dangling になる。両方をここで検知する。
if has_container -a && ! container_has_ssh_agent_mount; then
  echo "[sandbox] WARN: ${NAME} は ssh-agent forwarding mount を持っていない。" >&2
  echo "             container 内で git commit -S は動かない。" >&2
  echo "             有効化するには: ./scripts/sandbox-stop.sh && ./scripts/sandbox.sh" >&2
elif has_container -a && ! container_ssh_agent_source_matches; then
  echo "[sandbox] WARN: ${NAME} の ssh-agent socket mount source が host の SSH_AUTH_SOCK" >&2
  echo "             (${SSH_AUTH_SOCK:-unset}) と一致していない。" >&2
  echo "             host reboot / re-login で socket path が変わった可能性。" >&2
  echo "             修正するには: ./scripts/sandbox-stop.sh && ./scripts/sandbox.sh" >&2
fi

# GIT_NAME / GIT_EMAIL は container 起動時の env と recreate 後の gitconfig
# 書き戻しの両方で使うので、ここで一度だけ resolve する。
GIT_NAME=$(git -C "$REPO" config --get user.name || echo "Sandbox")
GIT_EMAIL=$(git -C "$REPO" config --get user.email || echo "sandbox@localhost")

if ! has_container -a; then
  # claude-permissions overlay は --mount の長形式で readonly を明示する。
  # Apple container 0.11.0 では `-v src:dst:ro` の `:ro` が silently 落とされる
  # ため、長形式の `readonly` flag に乗せる必要がある。
  # /root/.ssh も同じく readonly で expose (公開鍵 + known_hosts のみ)。
  MOUNTS=(
    -v "$REPO:$REPO"
    --mount "type=bind,source=$PERMISSIONS_OVERLAY_DIR,target=$PERMISSIONS_HOST_DIR,readonly"
    -v "$STATE/claude:/root/.claude"
    -v "$STATE/vscode-server:/root/.vscode-server"
    --mount "type=bind,source=$SSH_STAGING_DIR,target=/root/.ssh,readonly"
    --mount "type=bind,source=$GIT_CONFIG_STAGING_DIR,target=/root/.config/git,readonly"
    "${SSH_AGENT_MOUNT[@]}"
  )

  container run -d --name "$NAME" \
    --network "$NETWORK" \
    -m 6g \
    "${MOUNTS[@]}" \
    -e GIT_AUTHOR_NAME="$GIT_NAME" \
    -e GIT_AUTHOR_EMAIL="$GIT_EMAIL" \
    -e GIT_COMMITTER_NAME="$GIT_NAME" \
    -e GIT_COMMITTER_EMAIL="$GIT_EMAIL" \
    "${SSH_AGENT_ENV[@]}" \
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

# /root/.gitconfig は container 作成時に layer に焼かれないので recreate 毎に
# 消える。git identity と signing 関連の config を毎回 idempotent に書き戻す。
# 秘密鍵本体は container には無く、agent forwarding 経由で host 側 unlocked key
# を使う。値は container exec の引数として直接渡す (bash -c の文字列補間に値を
# 混ぜると identity に apostrophe 等が含まれた時に shell 構文が壊れるため)。
container exec "$NAME" git config --global user.name  "$GIT_NAME"  >/dev/null
container exec "$NAME" git config --global user.email "$GIT_EMAIL" >/dev/null
if (( SIGNING_ENABLED )); then
  container exec "$NAME" git config --global user.signingkey            /root/.ssh/github_ed25519.pub >/dev/null
  container exec "$NAME" git config --global gpg.format                 ssh                            >/dev/null
  container exec "$NAME" git config --global gpg.ssh.allowedSignersFile /root/.config/git/allowed_signers >/dev/null
  container exec "$NAME" git config --global commit.gpgsign             true                           >/dev/null
  container exec "$NAME" git config --global tag.gpgsign                true                           >/dev/null
else
  # forwarding 無効時は signing を強制すると通常の git commit すら通らなくなる。
  # 明示的に unset して fallback path を保証する。--unset は未設定だと exit 5 を
  # 返すので || true で抑える。
  container exec "$NAME" git config --global --unset commit.gpgsign 2>/dev/null || true
  container exec "$NAME" git config --global --unset tag.gpgsign    2>/dev/null || true
fi

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
