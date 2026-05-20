#!/usr/bin/env -S deno run --allow-run=container,git,ssh-add --allow-read --allow-write --allow-env=HOME,SSH_AUTH_SOCK
// Ensure the sho-sandbox container is up; drop into a shell unless --ensure-up.
// scripts/sandbox.sh の TS リライト。
//
// 関連:
//   .claude/rules/cli.md — sandbox / ops / mount / overlay の設計
//   flake.nix             — image 定義

import * as cmd from "./lib/cmd.ts";
import * as container from "./lib/container.ts";
import { ensureOverlayLayout, type OverlayPlan } from "./lib/permissions-overlay.ts";
import { prepareSshAgent, type SshAgentPlan } from "./lib/ssh-agent.ts";
import { applyContainerGitConfig, type GitIdentity, resolveGitIdentity } from "./lib/git-config.ts";

const NAME = "sho-sandbox";
const IMAGE = "sho-sandbox:latest";
const NETWORK = "sho-mcp-net";
const OPS_NAME = "sho-mcp-ops";

await main();

async function main(): Promise<void> {
  const ensureUpOnly = Deno.args[0] === "--ensure-up";

  const home = mustEnv("HOME");
  const state = `${home}/.sho-sandbox`;
  const repo = await resolveMainRepo();

  if (!await cmd.ok("container", ["--help"])) {
    abort("Apple container CLI not found (https://github.com/apple/container)");
  }
  if (!await container.imageExists(IMAGE)) {
    abort(`${IMAGE} not loaded.\n       Build & load with: ./scripts/sandbox-image.ts`);
  }

  await Deno.mkdir(`${state}/claude`, { recursive: true });
  await Deno.mkdir(`${state}/vscode-server`, { recursive: true });

  const overlay = await ensureOverlayLayout({ repo, state });
  const ssh = await prepareSshAgent({ state, home });
  if (!ssh.signingEnabled) {
    console.error(
      "[sandbox] WARN: container 内で git commit -S は無効化する (forwarding 不可 / 鍵 unload / mount 不一致)。",
    );
  }

  if (await container.containerExists(NAME, true)) {
    await assertMigrations({ name: NAME, network: NETWORK, ssh });
  }

  if (!await container.networkExists(NETWORK)) {
    console.error(`[sandbox] creating network ${NETWORK}`);
    await container.createNetwork(NETWORK);
  }

  const identity = await resolveGitIdentity(repo);

  if (!await container.containerExists(NAME, true)) {
    await container.createAndStart(buildRunSpec({ repo, state, overlay, ssh, identity }));
  } else if (!await container.containerExists(NAME)) {
    await container.start(NAME);
  }

  // /work は image PATH (=/work/node_modules/.bin) と既存 docs に baked。
  // container 起動直後に必ず張り直して、bind mount 先 (worktree 等) に追従させる。
  // repo path は bash の positional arg ($1) として渡し、shell interpolation を回避する。
  await container.execIn(
    NAME,
    ["bash", "-c", 'rm -rf /work && ln -sfT "$1" /work', "_", repo],
    { quiet: true },
  );

  await applyContainerGitConfig(NAME, identity, ssh);

  await syncOpsHostsEntry(NAME);

  if (ensureUpOnly) return;

  await container.execIn(NAME, ["/bin/bash"], { tty: true, cwd: repo });
}

function buildRunSpec(args: {
  repo: string;
  state: string;
  overlay: OverlayPlan;
  ssh: SshAgentPlan;
  identity: GitIdentity;
}): container.RunSpec {
  const { repo, state, overlay, ssh, identity } = args;
  const mounts: container.Mount[] = [
    { source: repo, target: repo },
    {
      source: overlay.overlayDir,
      target: `${repo}/.claude/permissions`,
      readonly: true,
    },
    { source: `${state}/claude`, target: "/root/.claude" },
    { source: `${state}/vscode-server`, target: "/root/.vscode-server" },
    { source: ssh.stagingDir, target: "/root/.ssh", readonly: true },
    { source: ssh.gitConfigStagingDir, target: "/root/.config/git", readonly: true },
  ];
  const env: Record<string, string> = {
    GIT_AUTHOR_NAME: identity.name,
    GIT_AUTHOR_EMAIL: identity.email,
    GIT_COMMITTER_NAME: identity.name,
    GIT_COMMITTER_EMAIL: identity.email,
  };
  if (ssh.agentSocket) {
    mounts.push({ source: ssh.agentSocket, target: "/run/ssh-agent.sock" });
    env.SSH_AUTH_SOCK = "/run/ssh-agent.sock";
  }
  return {
    name: NAME,
    image: IMAGE,
    network: NETWORK,
    memory: "6g",
    mounts,
    env,
    workdir: repo,
    cmd: ["sleep", "infinity"],
  };
}

async function assertMigrations(
  args: { name: string; network: string; ssh: SshAgentPlan },
): Promise<void> {
  const { name, network, ssh } = args;
  const { parsed, raw } = await container.inspect(name);
  if (!parsed) return;

  const onNetwork = (parsed.networks ?? []).some((n) => n.network === network);
  // mount destination の JSON key 名は Apple container CLI version で揺れるので、
  // schema 非依存な substring 検査で吸収する (bash 版も同方針)。
  const hasOverlay = raw.includes("claude-permissions");
  const hasSshAgentMount = raw.includes("/run/ssh-agent.sock");
  const sshSourceMatches = !ssh.agentSocket || raw.includes(`"${ssh.agentSocket}"`);

  if (!onNetwork) {
    console.error(`[sandbox] WARN: ${name} is not on ${network}.`);
    console.error(
      `             MCP servers in sho-mcp-ops will be unreachable from this container.`,
    );
    console.error(
      `             Recreate to attach: ./scripts/sandbox-stop.ts && ./scripts/sandbox.ts`,
    );
  }

  if (!hasOverlay) {
    console.error(`[sandbox] ERROR: ${name} lacks the claude-permissions overlay mount.`);
    console.error(`                Without it, host's project-level allow list would leak`);
    console.error(`                into the container. Aborting before any container exec.`);
    console.error(`                Recreate to apply:`);
    console.error(`                  ./scripts/sandbox-stop.ts && ./scripts/sandbox.ts`);
    Deno.exit(1);
  }

  if (!hasSshAgentMount) {
    console.error(`[sandbox] WARN: ${name} は ssh-agent forwarding mount を持っていない。`);
    console.error(`             container 内で git commit -S は動かない。`);
    console.error(`             有効化するには: ./scripts/sandbox-stop.ts && ./scripts/sandbox.ts`);
  } else if (!sshSourceMatches) {
    console.error(
      `[sandbox] WARN: ${name} の ssh-agent socket mount source が host の SSH_AUTH_SOCK`,
    );
    console.error(`             (${ssh.agentSocket ?? "unset"}) と一致していない。`);
    console.error(`             host reboot / re-login で socket path が変わった可能性。`);
    console.error(`             修正するには: ./scripts/sandbox-stop.ts && ./scripts/sandbox.ts`);
  }
}

/**
 * Apple container builtin DNS が sho-mcp-net 上の hostname を解決しない (CLI 0.11.0)
 * ので、sho-mcp-ops の現在 IP を inspect で引いて container 内 /etc/hosts に書き込む。
 * ops が存在しない / 別 network の場合は skip — MCP を使わない開発でも壊さない。
 */
async function syncOpsHostsEntry(name: string): Promise<void> {
  if (!await container.containerExists(OPS_NAME, true)) return;
  const { parsed } = await container.inspect(OPS_NAME);
  const opsNetwork = parsed?.networks?.find((n) => n.network === NETWORK);
  if (!opsNetwork) return;
  const opsIp = opsNetwork.ipv4Address.split("/")[0];

  // opsIp は container inspect 経由なので想定外文字列 (空 / metacharacter) は無いが、
  // positional arg ($1) で渡して shell interpolation を介在させない方針に揃える。
  const script = `
    grep -v '[[:space:]]sho-mcp-ops$' /etc/hosts > /tmp/.hosts.new 2>/dev/null || true
    echo "$1 sho-mcp-ops" >> /tmp/.hosts.new
    cat /tmp/.hosts.new > /etc/hosts
    rm -f /tmp/.hosts.new
  `;
  await container.execIn(name, ["bash", "-c", script, "_", opsIp], { quiet: true });
  console.error(`[sandbox] /etc/hosts: sho-mcp-ops -> ${opsIp}`);
}

/**
 * worktree から呼ばれても main repo の host 絶対 path を返す。container に self-mount
 * する path をここで決めるので、worktree の .git ファイルが container 内でも resolve する。
 */
async function resolveMainRepo(): Promise<string> {
  const scriptDir = new URL(".", import.meta.url).pathname;
  try {
    const gitDir = await cmd.output("git", [
      "-C",
      scriptDir,
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    ]);
    return parentDir(gitDir.trim());
  } catch {
    return parentDir(scriptDir.replace(/\/$/, ""));
  }
}

function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? "/" : path.slice(0, i);
}

function mustEnv(key: string): string {
  const v = Deno.env.get(key);
  if (!v) abort(`env ${key} not set`);
  return v;
}

function abort(msg: string): never {
  console.error(`ERROR: ${msg}`);
  Deno.exit(1);
}
