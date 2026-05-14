#!/usr/bin/env bash
# Supervisor: bootstraps 3 MCP servers inside the ops container, each wrapped
# with mcp-proxy so Claude (in the separate dev sandbox container) can reach
# them over SSE on the shared private network.
#
#   Claude ──SSE──▶ nginx :7001/:7002/:7003 ──▶ mcp-proxy 127.0.0.1:7011/:7012/:7013 ──▶ MCP server (stdio)
#                   └── limit_req で簡易レート制限 (nginx.conf 参照)
#
#   外側 7001/7002/7003    nginx が listen (network 上で他コンテナから見える)
#   内側 7011/7012/7013    mcp-proxy が 127.0.0.1 で bind (nginx 経由でしか到達不可)
#
#   :7001 / :7011  github-mcp-server (Go binary from GitHub releases)。
#                  --read-only と toolset ハードコードで起動し、
#                  クライアント側から scope を広げられないようにする。
#   :7002 / :7012  awslabs.cloudwatch-mcp-server (Python via uvx)。
#                  CloudWatch logs / metrics 専用。
#   :7003 / :7013  awslabs.aws-api-mcp-server (Python via uvx)。
#                  READ_OPERATIONS_ONLY=true で SQS / Lambda / EventBridge 等の
#                  生 AWS API を read 専用で expose する (CloudWatch 以外の診断用途)。
#                  dev sandbox から awscli を撤去した代わり。
#
# port は configurable にしない (env 経由の override を入れると nginx.conf 側に
# 同じ port が hard-code されてるので片肺になる)。値を変えたい時は nginx.conf
# / start.sh / .mcp.json を併せて手で書き換える。
#
# Runs as PID 2 under tini (flake.nix Entrypoint). 4 children (nginx + mcp-proxy
# × 3) を background で起動して `wait -n`、誰か 1 つ落ちたら全員 TERM して
# tini に clean shutdown を見せる。
#
# Tokens live ONLY in this process tree (GITHUB_PERSONAL_ACCESS_TOKEN from
# /run/secrets/github-pat, AWS_PROFILE chain resolved from /root/.aws via SDK).
# Claude container has no access to either.

set -euo pipefail

# === github-mcp-server: download release binary on first run ============

GH_BIN_DIR="/root/.cache/github-mcp-server"
GH_VERSION="${GH_MCP_VERSION:-latest}"
GH_BIN="${GH_BIN_DIR}/github-mcp-server"

if [[ ! -x "$GH_BIN" ]]; then
  case "$(uname -m)" in
    aarch64|arm64) ARCH=arm64 ;;
    x86_64|amd64)  ARCH=amd64 ;;
    *) echo "ERROR: unsupported arch $(uname -m)" >&2; exit 1 ;;
  esac
  if [[ "$GH_VERSION" == "latest" ]]; then
    URL="https://github.com/github/github-mcp-server/releases/latest/download/github-mcp-server_Linux_${ARCH}.tar.gz"
  else
    URL="https://github.com/github/github-mcp-server/releases/download/v${GH_VERSION}/github-mcp-server_${GH_VERSION}_Linux_${ARCH}.tar.gz"
  fi
  echo "[start] downloading github-mcp-server@${GH_VERSION} (${ARCH})"
  mkdir -p "$GH_BIN_DIR"
  curl -fsSL "$URL" | tar -xz -C "$GH_BIN_DIR" github-mcp-server
  chmod +x "$GH_BIN"
fi

if [[ ! -f /run/secrets/github-pat ]]; then
  echo "ERROR: /run/secrets/github-pat not mounted. Create ~/.sho-mcp-ops/github-pat first." >&2
  exit 1
fi
GITHUB_PERSONAL_ACCESS_TOKEN=$(< /run/secrets/github-pat)
export GITHUB_PERSONAL_ACCESS_TOKEN

# === spawn 3 servers under mcp-proxy (internal-only) ====================

echo "[start] github-mcp-server → mcp-proxy 127.0.0.1:7011"
# mcp-proxy はデフォルト --no-pass-environment で子プロセスに env を継承しない。
# token 1 つだけ -e で明示的に渡す（--pass-environment は他 env も漏れるので避ける）。
# --host 127.0.0.1 で loopback のみ bind し、外には nginx 経由でしか到達できない。
uvx mcp-proxy --port 7011 --host 127.0.0.1 \
  -e GITHUB_PERSONAL_ACCESS_TOKEN "$GITHUB_PERSONAL_ACCESS_TOKEN" \
  -- \
  "$GH_BIN" stdio \
    --read-only \
    --toolsets=pull_requests,issues,actions,repos &
GH_PID=$!

echo "[start] cloudwatch-mcp-server → mcp-proxy 127.0.0.1:7012"
# cloudwatch-mcp-server 内の numpy は libstdc++.so.6 を dlopen する。flake.nix で
# image に libstdc++ を入れ、Env の LD_LIBRARY_PATH に path を載せたが、
# mcp-proxy は子プロセスに env を継承しないので明示的に渡す必要がある。
#
# AWS 系も同様。mcp-proxy が env を strip するので、AWS_PROFILE / AWS_REGION /
# 設定ファイル path を明示的に渡さないと、cloudwatch-mcp-server 側の boto3 が
# crawler-debug → debug-all-role の assume チェーンに乗らず、別 identity で AWS
# を叩いて AccessDenied になる。
AWS_PROFILE="${AWS_PROFILE:-crawler-debug}"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
uvx mcp-proxy --port 7012 --host 127.0.0.1 \
  -e LD_LIBRARY_PATH "$LD_LIBRARY_PATH" \
  -e AWS_PROFILE "$AWS_PROFILE" \
  -e AWS_REGION "$AWS_REGION" \
  -e AWS_CONFIG_FILE /root/.aws/config \
  -e AWS_SHARED_CREDENTIALS_FILE /root/.aws/credentials \
  -- \
  uvx awslabs.cloudwatch-mcp-server@latest &
AWS_PID=$!

echo "[start] aws-api-mcp-server → mcp-proxy 127.0.0.1:7013 (read-only)"
# READ_OPERATIONS_ONLY=true で書き込み系 AWS API を server 側で拒否する。
# AWS_PROFILE / config file path 等は cloudwatch-mcp-server と同じ理由で
# 明示的に渡す（mcp-proxy が env を strip するため）。
uvx mcp-proxy --port 7013 --host 127.0.0.1 \
  -e LD_LIBRARY_PATH "$LD_LIBRARY_PATH" \
  -e AWS_PROFILE "$AWS_PROFILE" \
  -e AWS_REGION "$AWS_REGION" \
  -e AWS_CONFIG_FILE /root/.aws/config \
  -e AWS_SHARED_CREDENTIALS_FILE /root/.aws/credentials \
  -e READ_OPERATIONS_ONLY true \
  -- \
  uvx awslabs.aws-api-mcp-server@latest &
AWS_API_PID=$!

# === nginx (前段 reverse proxy + limit_req) =============================

# nginx prefix: pid/temp/log の書き込み先。/tmp は image の extraCommands で
# 1777 で生成済み (mode=ephemeral)。-p を明示しないと nix store 配下を触りに
# 行って read-only でコケる。
NGINX_PREFIX=/tmp/nginx-prefix
mkdir -p "$NGINX_PREFIX"

echo "[start] nginx :7001 → 127.0.0.1:7011, :7002 → 127.0.0.1:7012, :7003 → 127.0.0.1:7013"
# -e /dev/stderr: nginx は config 読み込み前に compile-default の error log
# (/var/log/nginx/error.log) を開きに行くので、それを stderr に逃がす。
# nginx.conf の error_log directive は config 読み込み後にしか効かない。
nginx -p "$NGINX_PREFIX/" -e /dev/stderr -c /work/packages/mcp-ops/nginx.conf -g 'daemon off;' &
NGINX_PID=$!

echo "[start] up: github=${GH_PID} aws=${AWS_PID} aws-api=${AWS_API_PID} nginx=${NGINX_PID}"

# Wait for any child to die; bring others down too so tini reaps cleanly.
wait -n
echo "[start] one child exited — tearing down siblings" >&2
kill -TERM "$GH_PID" "$AWS_PID" "$AWS_API_PID" "$NGINX_PID" 2>/dev/null || true
wait
exit 1
