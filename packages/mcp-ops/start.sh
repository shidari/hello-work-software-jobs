#!/usr/bin/env bash
# Supervisor: bootstraps 2 MCP servers inside the ops container, each wrapped
# with mcp-proxy so Claude (in the separate dev sandbox container) can reach
# them over SSE on the shared private network.
#
#   :$MCP_OPS_GH_PORT   github-mcp-server (Go binary from GitHub releases)
#                       wrapped by mcp-proxy, toolset hardcoded to read-only
#                       core sets so the client can't widen scope at runtime.
#   :$MCP_OPS_AWS_PORT  awslabs.cloudwatch-mcp-server (Python via uvx)
#                       wrapped by mcp-proxy.
#
# Runs as PID 2 under tini (flake.nix Entrypoint). Both children run in the
# background; we `wait -n` and tear the other down on first exit so tini sees
# a clean shutdown.
#
# Tokens live ONLY in this process tree (GITHUB_PERSONAL_ACCESS_TOKEN from
# /run/secrets/github-pat, AWS_PROFILE chain resolved from /root/.aws via SDK).
# Claude container has no access to either.

set -euo pipefail

GH_PORT="${MCP_OPS_GH_PORT:-7001}"
AWS_PORT="${MCP_OPS_AWS_PORT:-7002}"

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

# === spawn both servers under mcp-proxy =================================

echo "[start] github-mcp-server → mcp-proxy :${GH_PORT}"
uvx mcp-proxy --port "$GH_PORT" --host 0.0.0.0 -- \
  "$GH_BIN" stdio \
    --read-only \
    --toolsets=pull_requests,issues,actions,repos &
GH_PID=$!

echo "[start] cloudwatch-mcp-server → mcp-proxy :${AWS_PORT}"
uvx mcp-proxy --port "$AWS_PORT" --host 0.0.0.0 -- \
  uvx awslabs.cloudwatch-mcp-server@latest &
AWS_PID=$!

echo "[start] up: github=${GH_PID} aws=${AWS_PID}"

# Wait for either child to die; bring the other down too so tini reaps cleanly.
wait -n
echo "[start] one child exited — tearing down siblings" >&2
kill -TERM "$GH_PID" "$AWS_PID" 2>/dev/null || true
wait
exit 1
