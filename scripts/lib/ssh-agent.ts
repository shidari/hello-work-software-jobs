// Host の ssh-agent socket / 公開鍵 / known_hosts / allowed_signers を sho-sandbox
// にどう渡すかを判定する。秘密鍵は container に置かず、agent forwarding 経由で
// host 側 unlocked key を使う設計 (.claude/rules/cli.md 参照)。
//
// 副作用: $STATE/ssh/ と $STATE/git-config/ に host の .pub / known_hosts /
// allowed_signers を staging copy する (host 側で消えていれば staging からも消す)。
// host source が消えてるのに staging だけ残ると "signing 可" と誤判定するため。

import * as cmd from "./cmd.ts";

export type SshAgentPlan = {
  stagingDir: string;
  gitConfigStagingDir: string;
  agentSocket: string | null;
  pubKeyStaged: boolean;
  knownHostsStaged: boolean;
  allowedSignersStaged: boolean;
  keyInAgent: boolean;
  /** 上記の必要条件が全て揃った時のみ true */
  signingEnabled: boolean;
};

export async function prepareSshAgent(
  paths: { state: string; home: string },
): Promise<SshAgentPlan> {
  const { state, home } = paths;
  const stagingDir = `${state}/ssh`;
  const gitConfigStagingDir = `${state}/git-config`;
  await ensureDir(stagingDir, 0o700);
  await ensureDir(gitConfigStagingDir);

  const pubKeySrc = `${home}/.ssh/github_ed25519.pub`;
  const knownHostsSrc = `${home}/.ssh/known_hosts`;
  const allowedSignersSrc = `${home}/.config/git/allowed_signers`;

  const pubKeyStaged = await syncFile(pubKeySrc, `${stagingDir}/github_ed25519.pub`, 0o644);
  const knownHostsStaged = await syncFile(knownHostsSrc, `${stagingDir}/known_hosts`, 0o644);
  const allowedSignersStaged = await syncFile(
    allowedSignersSrc,
    `${gitConfigStagingDir}/allowed_signers`,
    0o644,
  );

  const envSocket = Deno.env.get("SSH_AUTH_SOCK") ?? null;
  const socketLive = envSocket ? await isSocket(envSocket) : false;
  const agentSocket = socketLive ? envSocket : null;

  const keyInAgent = pubKeyStaged && agentSocket ? await isKeyInAgent(pubKeySrc) : false;

  const signingEnabled = !!agentSocket && pubKeyStaged && keyInAgent;

  return {
    stagingDir,
    gitConfigStagingDir,
    agentSocket,
    pubKeyStaged,
    knownHostsStaged,
    allowedSignersStaged,
    keyInAgent,
    signingEnabled,
  };
}

async function ensureDir(path: string, mode?: number): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
  if (mode !== undefined) await Deno.chmod(path, mode);
}

/**
 * src → dst を copy (src が無ければ dst を削除)。
 * @returns dst に file が存在するようになったか
 */
async function syncFile(src: string, dst: string, mode: number): Promise<boolean> {
  try {
    await Deno.copyFile(src, dst);
    await Deno.chmod(dst, mode);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      await Deno.remove(dst).catch(() => {});
      return false;
    }
    throw e;
  }
}

async function isSocket(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    // S_IFSOCK = 0o140000, S_IFMT = 0o170000
    return stat.mode != null && (stat.mode & 0o170000) === 0o140000;
  } catch {
    return false;
  }
}

/**
 * 公開鍵が host ssh-agent に load されているか確認する。
 * `ssh-add -L` の各行と 公開鍵ファイルの 1+2 列目 (type + base64 body) を string 比較。
 * 別 fingerprint で見るのが安全だが bash 版に合わせる。
 */
async function isKeyInAgent(pubKeyPath: string): Promise<boolean> {
  const want = await readPubKeyIdentity(pubKeyPath);
  if (!want) return false;
  const listed = await cmd.output("ssh-add", ["-L"]).catch(() => "");
  return listed
    .split("\n")
    .map((line) => line.trim().split(/\s+/).slice(0, 2).join(" "))
    .some((id) => id === want);
}

async function readPubKeyIdentity(path: string): Promise<string | null> {
  try {
    const raw = await Deno.readTextFile(path);
    const [first] = raw.split("\n");
    const [type, body] = first.trim().split(/\s+/);
    if (!type || !body) return null;
    return `${type} ${body}`;
  } catch {
    return null;
  }
}
