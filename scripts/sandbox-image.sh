#!/usr/bin/env bash
# Build the sho-sandbox OCI image via nix, load it into Apple container,
# smoke-test it, then recreate the persistent container so the new image
# is picked up immediately. One command covers the full rebuild→apply cycle.
#
# Prerequisites (host macOS):
#   - nix-darwin with `nix.linux-builder.enable = true` (cross-build aarch64-linux)
#   - Apple `container` CLI (https://github.com/apple/container)
#
# `skopeo` is fetched on-demand via `nix run nixpkgs#skopeo` so brew/zap
# churn doesn't bite us.

set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAME="sho-sandbox"
TAG="${NAME}:latest"
OCI_ARCHIVE="$REPO/.sandbox.oci"

cd "$REPO"

if ! command -v nix >/dev/null 2>&1; then
  echo "ERROR: nix not found on PATH. Install via Determinate Systems installer." >&2
  exit 1
fi
if ! command -v container >/dev/null 2>&1; then
  echo "ERROR: Apple container CLI not found (https://github.com/apple/container)" >&2
  exit 1
fi

echo "[sandbox-image] nix build .#sandboxImage"
nix build .#sandboxImage --print-build-logs

echo "[sandbox-image] converting docker-archive -> oci-archive via skopeo"
nix run nixpkgs#skopeo -- --insecure-policy copy \
  "docker-archive:./result" "oci-archive:${OCI_ARCHIVE}:${TAG}"

echo "[sandbox-image] removing previous ${TAG} (if any)"
container image delete "${TAG}" 2>/dev/null || true

echo "[sandbox-image] container image load -i ${OCI_ARCHIVE}"
container image load -i "${OCI_ARCHIVE}"

rm -f "${OCI_ARCHIVE}"

echo "[sandbox-image] smoke test"
# Catches the "build succeeds but image is missing unix conventions" class of
# regression (e.g. /etc/passwd absent, /usr/bin/env shebang trampoline absent)
# that nix build itself wouldn't notice. Runs in a throw-away container.
container run --rm --name "${NAME}-smoketest" "${TAG}" /bin/bash -c '
  set -euo pipefail
  test -f /etc/passwd                          # uid 0 name lookup
  test -e /usr/bin/env                         # shebang trampoline
  [[ "$(id -un)" == "root" ]]                  # passwd entry resolves
  [[ "$(id -gn)" == "root" ]]                  # group entry resolves
  /usr/bin/env bash --version >/dev/null       # exec via /usr/bin/env works
  command -v getconf >/dev/null                # glibc bin (VSCode check-requirements)
  getconf GNU_LIBC_VERSION >/dev/null          # glibc version probe actually returns
' || { echo "[sandbox-image] smoke test FAILED" >&2; exit 1; }
echo "[sandbox-image] smoke test passed"

echo "[sandbox-image] loaded:"
container image ls | awk 'NR==1 || $1=="sho-sandbox"'

# Recreate the persistent container so the new image is picked up. The use
# case is "always rebuild from a fresh container" — running tasks shouldn't
# survive an image rebuild. sandbox-stop.sh / sandbox.sh remain available
# for ad-hoc lifecycle ops.
echo "[sandbox-image] recreating ${NAME} container from new image"
"$REPO/scripts/sandbox-stop.sh" >/dev/null 2>&1 || true
"$REPO/scripts/sandbox.sh" --ensure-up
echo "[sandbox-image] done."
