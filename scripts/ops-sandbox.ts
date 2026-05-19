#!/usr/bin/env -S deno run --allow-run=container,security --allow-read --allow-write --allow-env
// Start / stop / shell / logs for sho-mcp-ops container on the sho-mcp-net private network.
// scripts/ops-sandbox.sh の TS リライト。
//
// 認証情報: GitHub PAT は macOS Keychain (service=sho-mcp-ops, account=github-pat)、
// AWS は host の ~/.aws を snapshot して /root/.aws に mount する。dev sandbox には
// これらは渡らない設計。

import * as cmd from "./lib/cmd.ts";
import * as container from "./lib/container.ts";

const NAME = "sho-mcp-ops";
const IMAGE = "sho-mcp-ops:latest";
const NETWORK = "sho-mcp-net";
const KEYCHAIN_SERVICE = "sho-mcp-ops";
const KEYCHAIN_ACCOUNT = "github-pat";

type Action = "shell" | "ensure_up" | "logs" | "stop";

await main();

async function main(): Promise<void> {
  const action = parseAction(Deno.args);
  const home = mustEnv("HOME");
  const state = `${home}/.sho-mcp-ops`;
  const repo = resolveRepo();

  if (!await cmd.ok("container", ["--help"])) {
    abort("Apple container CLI not found (https://github.com/apple/container)");
  }

  if (action === "stop") {
    await container.stop(NAME);
    await container.deleteContainer(NAME);
    await Deno.remove(`${state}/pat/github-pat`).catch(() => {});
    console.error("[ops-sandbox] stopped.");
    return;
  }

  // Apple container CLI 0.11.0 の `container image ls` は NAME と TAG を別カラムで
  // 出すため、IMAGE ("name:tag") と直接比較すると false negative になる。tag を落として比較する。
  if (!await container.imageExists(IMAGE.split(":")[0])) {
    abort(`${IMAGE} not loaded.\n       Build & load with: ./scripts/ops-sandbox-image.ts`);
  }

  // dev sandbox と共有する private network。先に boot した方が作成する race-free 設計
  if (!await container.networkExists(NETWORK)) {
    console.error(`[ops-sandbox] creating network ${NETWORK}`);
    await container.createNetwork(NETWORK);
  }

  await Deno.mkdir(`${state}/aws`, { recursive: true });
  await Deno.mkdir(`${state}/cache`, { recursive: true });
  await Deno.mkdir(`${state}/pat`, { recursive: true });

  if (action !== "logs") {
    await loadGithubPat(state);
  }
  await syncAwsSnapshot({ home, state });

  if (!await container.containerExists(NAME, true)) {
    console.error(`[ops-sandbox] creating ${NAME} on network ${NETWORK}`);
    await container.createAndStart({
      name: NAME,
      image: IMAGE,
      network: NETWORK,
      memory: "1g",
      mounts: [
        { source: repo, target: "/work" },
        { source: `${state}/aws`, target: "/root/.aws" },
        { source: `${state}/cache`, target: "/root/.cache" },
        // Apple container CLI 0.11.0 の virtiofs は file-level bind mount が壊れるため、
        // host 側は ${state}/pat/ ディレクトリごと container の /run/secrets/ に mount し、
        // start.sh からは /run/secrets/github-pat (file) として読む構造にする
        { source: `${state}/pat`, target: "/run/secrets", readonly: true },
      ],
      env: {},
      cmd: [],
    });
  }

  if (!await container.containerExists(NAME)) {
    await container.start(NAME);
  }

  switch (action) {
    case "ensure_up":
      console.error(`[ops-sandbox] up (${NAME} on ${NETWORK})`);
      break;
    case "logs":
      await cmd.exec("container", ["logs", "-f", NAME]);
      break;
    case "shell":
      console.error("[ops-sandbox] attaching shell (Ctrl-D to detach)");
      await container.execIn(NAME, ["/bin/bash"], { tty: true });
      break;
  }
}

async function loadGithubPat(state: string): Promise<void> {
  const lookup = [
    "find-generic-password",
    "-s",
    KEYCHAIN_SERVICE,
    "-a",
    KEYCHAIN_ACCOUNT,
    "-w",
  ];
  if (!await cmd.ok("security", lookup)) {
    abort(
      `github-pat が Keychain に見つかりません (service=${KEYCHAIN_SERVICE}, account=${KEYCHAIN_ACCOUNT}).\n` +
        `       fine-grained PAT を https://github.com/settings/personal-access-tokens で発行し、\n` +
        `       次のコマンドで Keychain に保存してください (token はプロンプトに貼り付け; argv にも履歴にも残らない):\n` +
        `         security add-generic-password -s ${KEYCHAIN_SERVICE} -a ${KEYCHAIN_ACCOUNT} -T /usr/bin/security -w`,
    );
  }
  const token = (await cmd.output("security", lookup)).replace(/\n/g, "");
  // bash 版の `umask 077` 相当。自分しか読めない権限で書き出す
  await Deno.writeTextFile(`${state}/pat/github-pat`, token, { mode: 0o600 });
}

async function syncAwsSnapshot(paths: { home: string; state: string }): Promise<void> {
  const awsDir = `${paths.home}/.aws`;
  if (!await dirExists(awsDir)) return;
  for (const name of ["config", "credentials"]) {
    await Deno.copyFile(`${awsDir}/${name}`, `${paths.state}/aws/${name}`).catch(() => {});
  }
  // SSO profile を使う場合、boto3 は ~/.aws/sso/cache/<hash>.json から token を読む。
  // ドキュメントの回復手順 (aws sso login → ops 再起動) を成立させるために
  // cache ディレクトリも snapshot する。長期 IAM key のみの場合は不要だが、副作用なし。
  const ssoCacheSrc = `${awsDir}/sso/cache`;
  if (await dirExists(ssoCacheSrc)) {
    const ssoCacheDst = `${paths.state}/aws/sso/cache`;
    await Deno.mkdir(ssoCacheDst, { recursive: true });
    // 既存 snapshot は revoke 済みかもしれないので毎回全消し
    for await (const entry of Deno.readDir(ssoCacheDst)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        await Deno.remove(`${ssoCacheDst}/${entry.name}`).catch(() => {});
      }
    }
    for await (const entry of Deno.readDir(ssoCacheSrc)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        await Deno.copyFile(
          `${ssoCacheSrc}/${entry.name}`,
          `${ssoCacheDst}/${entry.name}`,
        ).catch(() => {});
      }
    }
  }
}

function parseAction(args: string[]): Action {
  for (const a of args) {
    switch (a) {
      case "--ensure-up":
        return "ensure_up";
      case "--logs":
        return "logs";
      case "--stop":
        return "stop";
    }
  }
  return "shell";
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

function resolveRepo(): string {
  const scriptDir = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
  return scriptDir.replace(/\/scripts$/, "");
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
