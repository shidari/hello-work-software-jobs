#!/usr/bin/env bash
# Build the sho-sandbox OCI image via nix and load it into Apple container.
#
# Prerequisites (host macOS):
#   - nix-darwin with `nix.linux-builder.enable = true` (cross-build aarch64-linux)
#   - Apple `container` CLI (https://github.com/apple/container)
#
# `skopeo` is fetched on-demand via `nix run nixpkgs#skopeo` so brew/zap
# churn doesn't bite us.

set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TAG="sho-sandbox:latest"
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

echo "[sandbox-image] done. Loaded:"
container image ls | awk 'NR==1 || $1=="sho-sandbox"'
