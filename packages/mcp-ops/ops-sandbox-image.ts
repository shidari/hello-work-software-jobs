#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-env
// Build sho-mcp-ops OCI image via packages/mcp-ops/flake.nix, load into Apple
// container, smoke-test, recreate the ops container. Counterpart to scripts/sandbox-image.ts
// (dev sandbox); two flakes are intentionally separate for independent bump cycles.

import * as cmd from "../../scripts/lib/cmd.ts";
import * as container from "../../scripts/lib/container.ts";

const NAME = "sho-mcp-ops";
const TAG = `${NAME}:latest`;

await main();

async function main(): Promise<void> {
  const repo = resolveRepo();
  const flakeDir = `${repo}/packages/mcp-ops`;
  const ociArchive = `${repo}/.mcp-ops.oci`;

  if (!(await cmd.ok("nix", ["--version"]))) {
    abort("nix not found on PATH. Install via Determinate Systems installer.");
  }
  if (!(await cmd.ok("container", ["--help"]))) {
    abort("Apple container CLI not found (https://github.com/apple/container)");
  }

  // Pre-flight: start.sh は image の Cmd であり host bind mount で渡るので、image 内の
  // smoke test では検知できない。ここで存在確認することで「container が起動直後に死ぬ」
  // 罠を build 段階で潰す。
  const startShPath = `${repo}/packages/mcp-ops/start.sh`;
  const startShStat = await Deno.stat(startShPath).catch(() => null);
  const startShExecutable = !!startShStat && !!startShStat.mode && (startShStat.mode & 0o111) !== 0;
  if (!startShStat || !startShExecutable) {
    abort(
      `${startShPath} missing or not executable.\n` +
        `       This is the ops container's Cmd (flake.nix) and must exist before\n` +
        "       running ops-sandbox.ts. chmod +x it after creation.",
    );
  }

  Deno.chdir(repo);

  console.error(`[ops-sandbox-image] nix build ${flakeDir}#opsImage`);
  await cmd.run("nix", ["build", `${flakeDir}#opsImage`, "--print-build-logs"]);

  console.error(
    "[ops-sandbox-image] converting docker-archive -> oci-archive via skopeo",
  );
  await cmd.run("nix", [
    "run",
    "nixpkgs#skopeo",
    "--",
    "--insecure-policy",
    "copy",
    "docker-archive:./result",
    `oci-archive:${ociArchive}:${TAG}`,
  ]);

  console.error(`[ops-sandbox-image] removing previous ${TAG} (if any)`);
  await container.deleteImage(TAG);

  console.error(`[ops-sandbox-image] container image load -i ${ociArchive}`);
  await container.loadImage(ociArchive);

  await Deno.remove(ociArchive).catch(() => {});

  console.error("[ops-sandbox-image] smoke test");
  // Image bootstrap の最小用件確認。サブプロセス (mcp-proxy / github-mcp-server バイナリ /
  // uvx-launched cloudwatch-mcp-server) は start.sh 実行時に取りに行くのでここでは見ない。
  const smokeScript = `set -euo pipefail
test -f /etc/passwd
[[ "$(id -un)" == "root" ]]
test -e /usr/bin/env
/usr/bin/env bash --version >/dev/null
command -v curl    >/dev/null
command -v tar     >/dev/null
command -v gzip    >/dev/null
command -v python3 >/dev/null
command -v uv      >/dev/null
command -v tini    >/dev/null
python3 -c "import ctypes; ctypes.CDLL(\\"libstdc++.so.6\\")"
`;
  try {
    await cmd.run("container", [
      "run",
      "--rm",
      "--name",
      `${NAME}-smoketest`,
      "--entrypoint",
      "/bin/bash",
      TAG,
      "-c",
      smokeScript,
    ]);
  } catch {
    abort("smoke test FAILED");
  }
  console.error("[ops-sandbox-image] smoke test passed");

  console.error("[ops-sandbox-image] loaded:");
  const list = await cmd.output("container", ["image", "ls"]).catch(() => "");
  const lines = list.split("\n");
  const filtered = lines.filter(
    (l, i) => i === 0 || l.split(/\s+/)[0] === NAME,
  );
  console.log(filtered.join("\n"));

  console.error(
    `[ops-sandbox-image] recreating ${NAME} container from new image`,
  );
  await cmd.ok(`${repo}/packages/mcp-ops/ops-sandbox.ts`, ["--stop"]);
  await cmd.run(`${repo}/packages/mcp-ops/ops-sandbox.ts`, ["--ensure-up"]);
  console.error("[ops-sandbox-image] done.");
}

function resolveRepo(): string {
  const scriptDir = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
  return scriptDir.replace(/\/packages\/mcp-ops$/, "");
}

function abort(msg: string): never {
  console.error(`ERROR: ${msg}`);
  Deno.exit(1);
}
