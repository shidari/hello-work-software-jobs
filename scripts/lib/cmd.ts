// Apple container / nix / git 等の subprocess を呼ぶための薄い wrapper。
// dax を入れずに Deno.Command を 4 種類の呼び出しパターンに集約する。
//   ok     — exit code が 0 か否かだけ。stdout/stderr は捨てる
//   output — stdout を string で取り出す。失敗時 throw
//   run    — stdout/stderr inherit。失敗時 throw
//   exec   — stdin/stdout/stderr inherit (対話的)。container exec -it 用

export type RunOpts = {
  cwd?: string;
  env?: Record<string, string>;
};

export class ProcessError extends Error {
  constructor(
    readonly prog: string,
    readonly args: readonly string[],
    readonly code: number,
    readonly stderr?: string,
  ) {
    const tail = stderr ? `\n--- stderr ---\n${stderr.trimEnd()}` : "";
    super(`\`${prog} ${args.join(" ")}\` exited with code ${code}${tail}`);
    this.name = "ProcessError";
  }
}

export async function ok(prog: string, args: string[], opts: RunOpts = {}): Promise<boolean> {
  const { code } = await new Deno.Command(prog, {
    args,
    cwd: opts.cwd,
    env: opts.env,
    stdin: "null",
    stdout: "null",
    stderr: "null",
  }).output();
  return code === 0;
}

export async function output(prog: string, args: string[], opts: RunOpts = {}): Promise<string> {
  const result = await new Deno.Command(prog, {
    args,
    cwd: opts.cwd,
    env: opts.env,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) {
    throw new ProcessError(prog, args, result.code, new TextDecoder().decode(result.stderr));
  }
  return new TextDecoder().decode(result.stdout);
}

export async function run(prog: string, args: string[], opts: RunOpts = {}): Promise<void> {
  const { code } = await new Deno.Command(prog, {
    args,
    cwd: opts.cwd,
    env: opts.env,
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  if (code !== 0) throw new ProcessError(prog, args, code);
}

export async function exec(prog: string, args: string[], opts: RunOpts = {}): Promise<number> {
  const child = new Deno.Command(prog, {
    args,
    cwd: opts.cwd,
    env: opts.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const { code } = await child.status;
  return code;
}
