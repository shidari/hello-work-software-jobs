// Apple container CLI (https://github.com/apple/container) の typed wrapper。
// `container * ls` の 1 列目に名前が並ぶ前提と、`container inspect` が JSON 配列を
// 吐く前提に閉じている (どちらも 0.11.0 で確認)。schema 変動に備えて mount の
// destination key 名等は parse せず raw JSON の substring 検査に逃がす箇所がある。

import * as cmd from "./cmd.ts";

export type NetworkAttachment = {
  network: string;
  /** CIDR 表記 ("10.x.y.z/24"). 呼び出し側で split */
  ipv4Address: string;
};

export type MountInfo = {
  source: string;
  /** Apple container CLI 表記。version で destination / target がブレるので optional */
  destination?: string;
  target?: string;
};

export type ContainerInspect = {
  networks?: NetworkAttachment[];
  mounts?: MountInfo[];
};

function namesFromList(out: string): string[] {
  return out
    .split("\n")
    .slice(1)
    .map((line) => line.split(/\s+/)[0])
    .filter((s) => s.length > 0);
}

export async function imageExists(name: string): Promise<boolean> {
  const out = await cmd.output("container", ["image", "ls"]).catch(() => "");
  return namesFromList(out).includes(name);
}

export async function containerExists(name: string, includeStopped = false): Promise<boolean> {
  const args = ["list"];
  if (includeStopped) args.push("-a");
  const out = await cmd.output("container", args).catch(() => "");
  return namesFromList(out).includes(name);
}

export async function networkExists(name: string): Promise<boolean> {
  const out = await cmd.output("container", ["network", "ls"]).catch(() => "");
  return namesFromList(out).includes(name);
}

export type InspectResult = { parsed: ContainerInspect | null; raw: string };

export async function inspect(name: string): Promise<InspectResult> {
  const raw = await cmd.output("container", ["inspect", name]).catch(() => "");
  if (!raw.trim()) return { parsed: null, raw: "" };
  try {
    const arr = JSON.parse(raw) as ContainerInspect[];
    return { parsed: arr[0] ?? null, raw };
  } catch {
    return { parsed: null, raw };
  }
}

export async function createNetwork(name: string): Promise<void> {
  await cmd.run("container", ["network", "create", name]);
}

export type Mount = { source: string; target: string; readonly?: boolean };

export type RunSpec = {
  name: string;
  image: string;
  network?: string;
  memory?: string;
  mounts: Mount[];
  env: Record<string, string>;
  workdir?: string;
  cmd: string[];
};

export async function createAndStart(spec: RunSpec): Promise<void> {
  const args: string[] = ["run", "-d", "--name", spec.name];
  if (spec.network) args.push("--network", spec.network);
  if (spec.memory) args.push("-m", spec.memory);
  for (const m of spec.mounts) {
    if (m.readonly) {
      // 長形式の readonly が必要 (Apple container 0.11.0 では `-v src:dst:ro` の `:ro` が silently drop)
      args.push("--mount", `type=bind,source=${m.source},target=${m.target},readonly`);
    } else {
      args.push("-v", `${m.source}:${m.target}`);
    }
  }
  for (const [k, v] of Object.entries(spec.env)) {
    args.push("-e", `${k}=${v}`);
  }
  if (spec.workdir) args.push("-w", spec.workdir);
  args.push(spec.image);
  args.push(...spec.cmd);
  await cmd.run("container", args);
}

export async function start(name: string): Promise<void> {
  await cmd.run("container", ["start", name]);
}

export type ExecOpts = { tty?: boolean; cwd?: string; quiet?: boolean };

export async function execIn(name: string, command: string[], opts: ExecOpts = {}): Promise<void> {
  const args: string[] = ["exec"];
  if (opts.tty) args.push("-it");
  if (opts.cwd) args.push("-w", opts.cwd);
  args.push(name, ...command);
  if (opts.tty) {
    await cmd.exec("container", args);
    return;
  }
  if (opts.quiet) {
    const success = await cmd.ok("container", args);
    if (!success) throw new Error(`container exec ${name} ${command.join(" ")} failed`);
    return;
  }
  await cmd.run("container", args);
}

/** best-effort stop (止まってる / 存在しない場合も silently 成功扱い) */
export async function stop(name: string): Promise<void> {
  await cmd.ok("container", ["stop", name]);
}

/** best-effort delete (存在しない場合も silently 成功扱い) */
export async function deleteContainer(name: string): Promise<void> {
  await cmd.ok("container", ["delete", name]);
}

export async function deleteImage(tag: string): Promise<void> {
  await cmd.ok("container", ["image", "delete", tag]);
}

export async function loadImage(archive: string): Promise<void> {
  await cmd.run("container", ["image", "load", "-i", archive]);
}
