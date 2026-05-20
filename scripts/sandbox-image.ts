#!/usr/bin/env -S deno run --allow-run=nix,container,./scripts/sandbox-stop.ts,./scripts/sandbox.ts --allow-read --allow-write
// Build sho-sandbox OCI image via nix, load into Apple container, smoke-test,
// then recreate the persistent container so the new image is picked up.
// scripts/sandbox-image.sh の TS リライト。
//
// 前提 (host macOS):
//   - nix-darwin with `nix.linux-builder.enable = true` (cross-build aarch64-linux)
//   - Apple `container` CLI (https://github.com/apple/container)
//
// skopeo は `nix run nixpkgs#skopeo` で都度取り回す (brew/zap churn 回避)。

import * as cmd from "./lib/cmd.ts";
import * as container from "./lib/container.ts";

const NAME = "sho-sandbox";
const TAG = `${NAME}:latest`;

await main();

async function main(): Promise<void> {
  const repo = resolveRepo();
  const ociArchive = `${repo}/.sandbox.oci`;

  // shebang の `--allow-run="./scripts/..."` は process 起動時の cwd を基準に
  // 絶対 path へ解決される (`Deno.chdir` 後ではなく)。launch cwd が repo と
  // 異なると recreate 段階で run permission denial になるため、ここで guard する。
  if (Deno.cwd() !== repo) {
    abort(
      `must be invoked from repo root (launch cwd: ${Deno.cwd()}, repo: ${repo}).\n` +
        `       Try: cd ${repo} && ./scripts/sandbox-image.ts`,
    );
  }

  if (!await cmd.ok("nix", ["--version"])) {
    abort("nix not found on PATH. Install via Determinate Systems installer.");
  }
  if (!await cmd.ok("container", ["--help"])) {
    abort("Apple container CLI not found (https://github.com/apple/container)");
  }

  Deno.chdir(repo);

  console.error("[sandbox-image] nix build .#sandboxImage");
  await cmd.run("nix", ["build", ".#sandboxImage", "--print-build-logs"]);

  console.error("[sandbox-image] converting docker-archive -> oci-archive via skopeo");
  await cmd.run("nix", [
    "run",
    "nixpkgs#skopeo",
    "--",
    "--insecure-policy",
    "copy",
    "docker-archive:./result",
    `oci-archive:${ociArchive}:${TAG}`,
  ]);

  console.error(`[sandbox-image] removing previous ${TAG} (if any)`);
  await container.deleteImage(TAG);

  console.error(`[sandbox-image] container image load -i ${ociArchive}`);
  await container.loadImage(ociArchive);

  await Deno.remove(ociArchive).catch(() => {});

  console.error("[sandbox-image] smoke test");
  // build 成功でも image に unix conventions が欠ける (/etc/passwd 不在、env trampoline 不在
  // 等) 退化を検知する。throw-away container で実行する。
  const smokeScript = `set -euo pipefail
test -f /etc/passwd                          # uid 0 name lookup
test -e /usr/bin/env                         # shebang trampoline
[[ "$(id -un)" == "root" ]]                  # passwd entry resolves
[[ "$(id -gn)" == "root" ]]                  # group entry resolves
/usr/bin/env bash --version >/dev/null       # exec via /usr/bin/env works
command -v getconf >/dev/null                # glibc bin (VSCode check-requirements)
getconf GNU_LIBC_VERSION >/dev/null          # glibc version probe actually returns
test -f /etc/ld.so.cache                     # ldconfig cache pre-populated
/sbin/ldconfig -p | grep -q "libc\\.so"      # ldconfig wrapper resolves cache
test -e /lib/ld-linux-aarch64.so.1           # FHS interpreter symlink for prebuilt binaries
[[ -n "\${LD_LIBRARY_PATH:-}" ]]             # LD_LIBRARY_PATH baked for non-nix prebuilt
ls $(echo "$LD_LIBRARY_PATH" | cut -d: -f2)/libstdc++.so.6 >/dev/null
`;
  try {
    await cmd.run("container", [
      "run",
      "--rm",
      "--name",
      `${NAME}-smoketest`,
      TAG,
      "/bin/bash",
      "-c",
      smokeScript,
    ]);
  } catch {
    abort("smoke test FAILED");
  }
  console.error("[sandbox-image] smoke test passed");

  console.error("[sandbox-image] loaded:");
  const list = await cmd.output("container", ["image", "ls"]).catch(() => "");
  const lines = list.split("\n");
  const filtered = lines.filter((l, i) => i === 0 || l.split(/\s+/)[0] === NAME);
  console.log(filtered.join("\n"));

  // image rebuild は "fresh container から走り直す" が前提。running tasks は survive させない。
  // sub-script は相対 path で起動する (--allow-run="./scripts/foo.ts" にマッチさせるため。
  // Deno.chdir(repo) 済みなので resolve は repo 起点)。
  console.error(`[sandbox-image] recreating ${NAME} container from new image`);
  await cmd.ok("./scripts/sandbox-stop.ts", []);
  await cmd.run("./scripts/sandbox.ts", ["--ensure-up"]);
  console.error("[sandbox-image] done.");
}

function resolveRepo(): string {
  const scriptDir = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
  return scriptDir.replace(/\/scripts$/, "");
}

function abort(msg: string): never {
  console.error(`ERROR: ${msg}`);
  Deno.exit(1);
}
