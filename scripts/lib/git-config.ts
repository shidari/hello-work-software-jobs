// Container 内の /root/.gitconfig は image layer に焼かれず recreate 毎に消えるので、
// 起動時に host の git identity を引き、container 内で git config --global を書き戻す。
// signing 関連は agent forwarding が有効な時のみ書く (無効時に gpgsign=true が残ると
// 通常の git commit すら通らなくなるため明示的に unset する)。

import * as cmd from "./cmd.ts";
import * as container from "./container.ts";
import type { SshAgentPlan } from "./ssh-agent.ts";

export type GitIdentity = { name: string; email: string };

export async function resolveGitIdentity(repo: string): Promise<GitIdentity> {
  const name = await cmd.output("git", ["-C", repo, "config", "--get", "user.name"])
    .then((s) => s.trim())
    .catch(() => "Sandbox");
  const email = await cmd.output("git", ["-C", repo, "config", "--get", "user.email"])
    .then((s) => s.trim())
    .catch(() => "sandbox@localhost");
  return { name, email };
}

export async function applyContainerGitConfig(
  containerName: string,
  identity: GitIdentity,
  ssh: SshAgentPlan,
): Promise<void> {
  await setConfig(containerName, "user.name", identity.name);
  await setConfig(containerName, "user.email", identity.email);

  if (ssh.signingEnabled) {
    await setConfig(containerName, "user.signingkey", "/root/.ssh/github_ed25519.pub");
    await setConfig(containerName, "gpg.format", "ssh");
    await setConfig(
      containerName,
      "gpg.ssh.allowedSignersFile",
      "/root/.config/git/allowed_signers",
    );
    await setConfig(containerName, "commit.gpgsign", "true");
    await setConfig(containerName, "tag.gpgsign", "true");
  } else {
    await unsetConfig(containerName, "commit.gpgsign");
    await unsetConfig(containerName, "tag.gpgsign");
  }
}

async function setConfig(name: string, key: string, value: string): Promise<void> {
  await container.execIn(name, ["git", "config", "--global", key, value], { quiet: true });
}

async function unsetConfig(name: string, key: string): Promise<void> {
  // git config --unset は未設定だと exit 5。best-effort で捨てる
  await cmd.ok("container", ["exec", name, "git", "config", "--global", "--unset", key]);
}
