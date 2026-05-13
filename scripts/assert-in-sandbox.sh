#!/usr/bin/env bash
# Refuse to proceed unless we're inside the dev sandbox (flake.nix sets
# SHO_SANDBOX=1 on the image Env). Called from package.json `preinstall` so
# host-side `pnpm install` fails fast with an actionable message.
#
# Intentionally NOT a security boundary — it's a guard against accidental
# host-side toolchain use. A determined caller can `SHO_SANDBOX=1` the env
# themselves, but that's their problem.

if [[ "${SHO_SANDBOX:-}" == "1" ]]; then
  exit 0
fi

# CI bypass: GitHub Actions / generic CI runners set CI=true. Letting installs
# run there is required for PR checks and deploy workflows that do
# `pnpm install --frozen-lockfile` on `ubuntu-latest` without our sandbox env.
# The sandbox guard is a developer-host gate, not a CI gate.
if [[ "${CI:-}" == "true" ]]; then
  exit 0
fi

cat >&2 <<'EOF'
ERROR: This codebase only runs inside the dev sandbox container.

  Build the sandbox image:
    ./scripts/sandbox-image.sh

  Enter the sandbox:
    ./scripts/sandbox.sh

  Then run your command from inside the container (pnpm install, etc.).

(Bypass options: SHO_SANDBOX=1 on host, or CI=true for CI runners. Both are
 unsupported outside their intended contexts.)
EOF
exit 1
