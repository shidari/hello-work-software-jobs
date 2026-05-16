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
#                  toolset ハードコードで起動し、クライアント側から scope を
#                  広げられないようにする。write 系 tool は Keychain に保存した
#                  PAT の scope (Pull requests:RW / Issues:RW 等) で制限する。
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

# === spawn 3 servers under mcp-proxy (internal-only) ====================
#
# mcp-proxy の `-e KEY VAL` は値が proxy 自身の argv に乗り、/proc/<pid>/cmdline
# から同コンテナ内の任意プロセス・host の `container exec` から読めてしまう。
# 代わりに各 server を独立した subshell で囲み、必要な env だけ export してから
# `--pass-environment` で child に継承させる。subshell が分離されているので
# GITHUB_PAT は AWS subshell からは見えない (親 shell には PAT を露出させない)。
#
# LD_LIBRARY_PATH は initProcess env から既に export 済みで親 shell に継承されて
# おり、subshell 経由で child まで自動で届く (flake.nix で libstdc++ の path を
# 載せてある — numpy の dlopen に必要)。
#
# AWS server を `crawler-debug → debug-all-role` の assume チェーンに正しく
# 乗せるため、AWS_PROFILE / AWS_REGION / AWS_CONFIG_FILE / AWS_SHARED_CREDENTIALS_FILE
# を明示 export する (未指定だと別 identity で AWS を叩いて AccessDenied)。
#
# --host 127.0.0.1 で loopback のみ bind、外向きは nginx 経由のみ。

AWS_PROFILE="${AWS_PROFILE:-crawler-debug}"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"

echo "[start] github-mcp-server → mcp-proxy 127.0.0.1:7011"
(
  GITHUB_PERSONAL_ACCESS_TOKEN=$(< /run/secrets/github-pat)
  export GITHUB_PERSONAL_ACCESS_TOKEN
  exec uvx mcp-proxy --port 7011 --host 127.0.0.1 --pass-environment \
    -- \
    "$GH_BIN" stdio --toolsets=pull_requests,issues,actions,repos
) &
GH_PID=$!

echo "[start] cloudwatch-mcp-server → mcp-proxy 127.0.0.1:7012"
(
  export AWS_PROFILE AWS_REGION
  export AWS_CONFIG_FILE=/root/.aws/config
  export AWS_SHARED_CREDENTIALS_FILE=/root/.aws/credentials
  exec uvx mcp-proxy --port 7012 --host 127.0.0.1 --pass-environment \
    -- \
    uvx awslabs.cloudwatch-mcp-server@latest
) &
AWS_PID=$!

echo "[start] aws-api-mcp-server → mcp-proxy 127.0.0.1:7013 (read-only)"
# READ_OPERATIONS_ONLY=true で書き込み系 AWS API を server 側で拒否する。
(
  export AWS_PROFILE AWS_REGION
  export AWS_CONFIG_FILE=/root/.aws/config
  export AWS_SHARED_CREDENTIALS_FILE=/root/.aws/credentials
  export READ_OPERATIONS_ONLY=true
  exec uvx mcp-proxy --port 7013 --host 127.0.0.1 --pass-environment \
    -- \
    uvx awslabs.aws-api-mcp-server@latest
) &
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
