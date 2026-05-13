#!/usr/bin/env bash
# Build the sho-mcp-ops OCI image via packages/mcp-ops/flake.nix, load it into
# Apple container, smoke-test, then recreate the ops container so the new image
# is picked up. Counterpart to scripts/sandbox-image.sh (which handles the dev
# sandbox); the two are intentionally separate so each can be bumped on its
# own cycle and neither rebuilds the other.

set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
FLAKE_DIR="$REPO/packages/mcp-ops"
NAME="sho-mcp-ops"
TAG="${NAME}:latest"
OCI_ARCHIVE="$REPO/.mcp-ops.oci"

cd "$REPO"

if ! command -v nix >/dev/null 2>&1; then
  echo "ERROR: nix not found on PATH. Install via Determinate Systems installer." >&2
  exit 1
fi
if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi
# Pre-flight: start.sh is the image's Cmd (flake.nix Cmd = [.../start.sh]) and
# lives in the host bind mount at runtime — not baked into the image — so the
# in-image smoke test below cannot see it. Verify presence here so a missing
# entrypoint fails this build script instead of producing a container that
# silently dies on first start.
if [[ ! -x "$REPO/packages/mcp-ops/start.sh" ]]; then
  echo "ERROR: $REPO/packages/mcp-ops/start.sh missing or not executable." >&2
  echo "       This is the ops container's Cmd (flake.nix) and must exist before" >&2
  echo "       running ops-sandbox.sh. chmod +x it after creation." >&2
  exit 1
fi

echo "[ops-sandbox-image] nix build ${FLAKE_DIR}#opsImage"
nix build "${FLAKE_DIR}#opsImage" --print-build-logs

echo "[ops-sandbox-image] converting docker-archive -> oci-archive via skopeo"
nix run nixpkgs#skopeo -- --insecure-policy copy \
  "docker-archive:./result" "oci-archive:${OCI_ARCHIVE}:${TAG}"

echo "[ops-sandbox-image] removing previous ${TAG} (if any)"
container image delete "${TAG}" 2>/dev/null || true

echo "[ops-sandbox-image] container image load -i ${OCI_ARCHIVE}"
container image load -i "${OCI_ARCHIVE}"

rm -f "${OCI_ARCHIVE}"

echo "[ops-sandbox-image] smoke test"
# Verify the image has the bare minimum to bootstrap MCP servers. Subprocesses
# (mcp-proxy, github-mcp-server binary, uvx-launched cloudwatch-mcp-server) are
# fetched at start.sh runtime, so we don't check them here.
container run --rm --name "${NAME}-smoketest" --entrypoint /bin/bash "${TAG}" -c '
  set -euo pipefail
  test -f /etc/passwd
  [[ "$(id -un)" == "root" ]]
  test -e /usr/bin/env           # `#!/usr/bin/env bash` shebang trampoline
  /usr/bin/env bash --version >/dev/null   # exec via /usr/bin/env actually works
  command -v curl    >/dev/null  # github-mcp-server release download
  command -v tar     >/dev/null  # start.sh extracts tarball
  command -v gzip    >/dev/null  # ditto (tar -xz needs gzip)
  command -v python3 >/dev/null  # uvx runtime
  command -v uv      >/dev/null  # awslabs.cloudwatch-mcp-server / mcp-proxy 起動経路
  command -v tini    >/dev/null  # PID 1 で子プロセスの signal を取り回す
  # numpy / scipy が dlopen で要求するため LD_LIBRARY_PATH 越しに見える必要あり
  python3 -c "import ctypes; ctypes.CDLL(\"libstdc++.so.6\")"
' || { echo "[ops-sandbox-image] smoke test FAILED" >&2; exit 1; }
echo "[ops-sandbox-image] smoke test passed"

echo "[ops-sandbox-image] loaded:"
container image ls | awk -v n="$NAME" 'NR==1 || $1==n'

echo "[ops-sandbox-image] recreating ${NAME} container from new image"
"$REPO/scripts/ops-sandbox.sh" --stop >/dev/null 2>&1 || true
"$REPO/scripts/ops-sandbox.sh" --ensure-up
echo "[ops-sandbox-image] done."
