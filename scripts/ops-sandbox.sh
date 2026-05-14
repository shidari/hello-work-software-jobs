#!/usr/bin/env bash
# Start the sho-mcp-ops container on a private Apple container network shared
# with sho-sandbox (Claude). The ops container holds GitHub PAT + AWS profile
# and runs MCP servers (github-mcp-server, awslabs.cloudwatch-mcp-server) wrapped
# by mcp-proxy for stdio→SSE adaptation. Claude side connects via the private
# network — no host port is exposed.
#
# Usage:
#   ops-sandbox.sh                 # ensure container is up, attach a shell
#   ops-sandbox.sh --ensure-up     # ensure up and exit (used by sandbox-image.sh)
#   ops-sandbox.sh --logs          # tail container stdout
#   ops-sandbox.sh --stop          # stop and remove

set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAME=sho-mcp-ops
IMAGE=sho-mcp-ops:latest
NETWORK=sho-mcp-net

ACTION=shell
for arg in "$@"; do
  case "$arg" in
    --ensure-up) ACTION=ensure_up ;;
    --logs)      ACTION=logs      ;;
    --stop)      ACTION=stop      ;;
  esac
done

if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi

has_image() {
  container image ls 2>/dev/null | awk -v n="$NAME" 'NR>1 && $1==n {f=1} END{exit !f}'
}
has_container() {
  container list ${1:-} 2>/dev/null | awk -v n="$NAME" 'NR>1 && $1==n {f=1} END{exit !f}'
}
has_network() {
  container network ls 2>/dev/null | awk -v n="$NETWORK" 'NR>1 && $1==n {f=1} END{exit !f}'
}

if [[ "$ACTION" == "stop" ]]; then
  container stop "$NAME" 2>/dev/null || true
  container delete "$NAME" 2>/dev/null || true
  rm -f "$HOME/.sho-mcp-ops/github-pat"
  echo "[ops-sandbox] stopped."
  exit 0
fi

if ! has_image; then
  echo "ERROR: ${IMAGE} not loaded." >&2
  echo "       Build & load with: ./scripts/ops-sandbox-image.sh" >&2
  exit 1
fi

# Private network shared between claude sandbox and ops container.
# scripts/sandbox.sh is expected to attach sho-sandbox to the same network.
if ! has_network; then
  echo "[ops-sandbox] creating network ${NETWORK}"
  container network create "$NETWORK" >/dev/null
fi

# Token / credential state. ops container is the ONLY surface that touches
# these — claude container's mount set must not include them.
#   github-pat: macOS Keychain が source of truth。起動毎に Keychain から取り出して
#               $STATE/github-pat に書き出し、bind mount で /run/secrets に渡す。
#               container 稼働中だけ host に file が存在。--stop で破棄する。
#   aws/      : ~/.aws snapshot, same convention as sho-sandbox uses today
STATE="$HOME/.sho-mcp-ops"
KEYCHAIN_SERVICE=sho-mcp-ops
KEYCHAIN_ACCOUNT=github-pat
mkdir -p "$STATE/aws" "$STATE/cache"

if [[ "$ACTION" != "logs" ]]; then
  if security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w >/dev/null 2>&1; then
    (
      umask 077
      security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w \
        | tr -d '\n' > "$STATE/github-pat"
    )
  else
    echo "ERROR: github-pat が Keychain に見つかりません (service=${KEYCHAIN_SERVICE}, account=${KEYCHAIN_ACCOUNT})." >&2
    echo "       fine-grained PAT を https://github.com/settings/personal-access-tokens で発行し、" >&2
    echo "       次のコマンドで Keychain に保存してください (token はプロンプトに貼り付け; argv にも履歴にも残らない):" >&2
    echo "         security add-generic-password -s ${KEYCHAIN_SERVICE} -a ${KEYCHAIN_ACCOUNT} -T /usr/bin/security -w" >&2
    exit 1
  fi
fi
if [[ -d "$HOME/.aws" ]]; then
  [[ -f "$HOME/.aws/config"      ]] && cp -p "$HOME/.aws/config"      "$STATE/aws/config"
  [[ -f "$HOME/.aws/credentials" ]] && cp -p "$HOME/.aws/credentials" "$STATE/aws/credentials"
  # SSO profile を使う場合、boto3 は ~/.aws/sso/cache/<hash>.json から token を読む。
  # ドキュメントは「aws sso login --profile ... → ops 再起動」を回復手順として
  # 案内しているため、その手順を実際に成立させるには cache ディレクトリも
  # 都度 snapshot しておく必要がある。長期 IAM key + AssumeRole のみの場合は
  # 不要だが、副作用は無いので無条件にコピーする。
  if [[ -d "$HOME/.aws/sso/cache" ]]; then
    mkdir -p "$STATE/aws/sso/cache"
    # 既存 snapshot は revoke 済みかもしれないので、毎回まるごと差し替える。
    rm -f "$STATE/aws/sso/cache/"*.json 2>/dev/null || true
    cp -p "$HOME/.aws/sso/cache/"*.json "$STATE/aws/sso/cache/" 2>/dev/null || true
  fi
fi

if ! has_container -a; then
  MOUNTS=(
    -v "$REPO:/work"
    -v "$STATE/aws:/root/.aws"
    -v "$STATE/cache:/root/.cache"
    -v "$STATE/github-pat:/run/secrets/github-pat:ro"
  )

  echo "[ops-sandbox] creating ${NAME} on network ${NETWORK}"
  container run -d --name "$NAME" \
    --network "$NETWORK" \
    -m 1g \
    "${MOUNTS[@]}" \
    "$IMAGE"
fi

if ! container list 2>/dev/null | awk -v n="$NAME" 'NR>1 && $1==n {f=1} END{exit !f}'; then
  container start "$NAME" >/dev/null
fi

case "$ACTION" in
  ensure_up) echo "[ops-sandbox] up (${NAME} on ${NETWORK})";;
  logs)      container logs -f "$NAME";;
  shell)
    echo "[ops-sandbox] attaching shell (Ctrl-D to detach)"
    container exec -it "$NAME" /bin/bash
    ;;
esac
