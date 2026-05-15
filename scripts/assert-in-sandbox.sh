#!/usr/bin/env bash
# Refuse to proceed unless we're inside the dev sandbox (sho-sandbox) or in CI.
# Called from package.json `preinstall` so host-side `pnpm install` fails fast.
#
# Detection prefers kernel + bind-mount over env vars — env can be spoofed and
# (more commonly) get lost on image rebuilds, leaving SHO_SANDBOX unset inside
# a valid container. See .claude/rules/general.md "実行環境の判定".
#
# Intentionally NOT a security boundary — it's a guard against accidental
# host-side toolchain use.

# CI bypass: any non-empty CI env signals "we're in CI" (GitHub Actions sets
# CI=true, Vercel sets CI=1, Cloudflare Workers Builds also sets CI). PR
# checks and deploy workflows run `pnpm install --frozen-lockfile` outside
# the sandbox and must be allowed through.
if [[ -n "${CI:-}" ]]; then
  exit 0
fi

# Primary detection: aarch64-linux container with /work bind-mounted as a
# symlink to the repo. Both signals are established by scripts/sandbox.sh
# at container start and survive across env reloads or shells that drop
# SHO_SANDBOX.
if [[ "$(uname -s)" == "Linux" && -L /work ]]; then
  exit 0
fi

# Last-resort manual bypass for unusual environments (e.g. remote nix linux
# builder VMs invoked directly). Documented but discouraged.
if [[ "${SHO_SANDBOX:-}" == "1" ]]; then
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
