#!/usr/bin/env -S deno run --allow-read --allow-write=/tmp --allow-run=git
// Block Edit/Write/NotebookEdit on the main worktree to enforce "1 feature = 1 worktree".
// See .claude/rules/general.md for rationale.
//
// Allowlist: docs (`.md`) are permitted on main without ceremony, matching the rule
// "application/test code requires worktree; docs do not". Extend MAIN_EDIT_ALLOWED_EXTS
// when new extension classes prove to be safely main-editable.
//
// Bypass for everything else: `touch /tmp/.claude-allow-main-edit` (one-shot, auto-consumed).
//
// Skipped on Claude Code on the web: each session already runs in an ephemeral
// cloud container on its own branch (a fresh clone, not a worktree setup), so
// the worktree-isolation goal is met by the session boundary itself.
//
// POSIX path helpers are inlined below to keep this hook dependency-free
// (no @std/path import → no `--allow-net` required even on first run).

function isAbsolute(p: string): boolean {
  return p.startsWith("/");
}

function basename(p: string): string {
  if (p === "/" || p === "") return "";
  const trimmed = p.endsWith("/") ? p.slice(0, -1) : p;
  const i = trimmed.lastIndexOf("/");
  return i === -1 ? trimmed : trimmed.slice(i + 1);
}

function dirname(p: string): string {
  if (p === "/" || p === "") return p === "/" ? "/" : ".";
  const trimmed = p.endsWith("/") ? p.slice(0, -1) : p;
  const i = trimmed.lastIndexOf("/");
  if (i === -1) return ".";
  if (i === 0) return "/";
  return trimmed.slice(0, i);
}

// 右から左に走査し、絶対 path を見つけたらそれを root として結合を打ち切る。
// hookCwd は Claude harness が常に絶対 path で渡してくるので、cwd 参照は不要。
function resolve(...parts: string[]): string {
  let acc = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (!p) continue;
    acc = acc ? `${p.replace(/\/+$/, "")}/${acc}` : p;
    if (isAbsolute(p)) return acc;
  }
  return acc;
}

const MAIN_EDIT_ALLOWED_EXTS = new Set(["md"]);
const SENTINEL = "/tmp/.claude-allow-main-edit";

type HookInput = {
  tool_input?: { file_path?: string; notebook_path?: string };
  cwd?: string;
};

// ---- helpers ----------------------------------------------------------------

async function statOrNull(path: string): Promise<Deno.FileInfo | null> {
  try {
    return await Deno.stat(path);
  } catch {
    return null;
  }
}

async function lstatOrNull(path: string): Promise<Deno.FileInfo | null> {
  try {
    return await Deno.lstat(path);
  } catch {
    return null;
  }
}

// `realpath -m` equivalent: tolerate missing target (Write tool may be creating
// the file), but follow symlinks in any existing ancestor directory.
async function realPathMissingOk(path: string): Promise<string> {
  try {
    return await Deno.realPath(path);
  } catch {
    /* leaf missing */
  }
  try {
    return `${await Deno.realPath(dirname(path))}/${basename(path)}`;
  } catch {
    return resolve(path);
  }
}

function extLower(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

function deny(message: string): never {
  console.error(message);
  Deno.exit(2);
}

// ---- web short-circuit ------------------------------------------------------
// Claude Code on the web = Linux + /home/user exists + /work is NOT a symlink.

if (Deno.build.os === "linux") {
  const workInfo = await lstatOrNull("/work");
  const homeUser = await statOrNull("/home/user");
  if (homeUser?.isDirectory && (workInfo === null || !workInfo.isSymlink)) {
    Deno.exit(0);
  }
}

// ---- parse hook input -------------------------------------------------------

const stdinText = await new Response(Deno.stdin.readable).text();
const input: HookInput = stdinText ? JSON.parse(stdinText) : {};
const filePath =
  input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "";
const hookCwd = input.cwd ?? "";
if (!filePath) Deno.exit(0);

const absPath = isAbsolute(filePath) ? filePath : resolve(hookCwd, filePath);

// ---- refuse symlink edits outright -----------------------------------------
// The allowlist contract is "the extension reflects what is actually being
// written"; symlinks break that invariant (evil.md -> code.ts).

const leafLstat = await lstatOrNull(absPath);
if (leafLstat?.isSymlink) {
  const target = await Deno.realPath(absPath).catch(() => "<unresolved>");
  deny(
    `[enforce-worktree] Refusing to edit symlink "${filePath}" (-> ${target}).

Symlink targets can bypass the extension allowlist (e.g. evil.md -> code.ts).
Edit the resolved target directly, or use the sentinel if you really mean to
write through this symlink: \`touch ${SENTINEL}\`.`,
  );
}

// ---- locate repo, decide if main worktree ----------------------------------

const resolvedPath = await realPathMissingOk(absPath);

// `git rev-parse --show-toplevel` distinguishes three cases by exit code:
//   0   → inside a working tree; stdout has the toplevel path
//   128 → not inside a working tree; stderr says so (treat as "outside repo, allow")
//   other → unexpected failure (binary missing, permission denied, etc.) → fail closed
const gitProc = await new Deno.Command("git", {
  args: ["-C", dirname(resolvedPath), "rev-parse", "--show-toplevel"],
  stdout: "piped",
  stderr: "piped",
  // Empty env: this hook only needs git to read a local repo. Inheriting the
  // parent env would (a) require --allow-env, and (b) leak vars like AWS_*,
  // GITHUB_TOKEN, LD_LIBRARY_PATH, etc. into a subprocess that has no business
  // seeing them.
  clearEnv: true,
  env: {},
})
  .output()
  .catch((err: unknown) => {
    console.error(
      `[enforce-worktree] failed to spawn git: ${(err as Error).message}`,
    );
    Deno.exit(2);
  });

let repoRoot = "";
if (gitProc.code === 0) {
  repoRoot = new TextDecoder().decode(gitProc.stdout).trim();
} else if (gitProc.code === 128) {
  // Genuinely outside any git repo (e.g. ~/.claude/* user-level files) — allow.
  Deno.exit(0);
} else {
  const stderr = new TextDecoder().decode(gitProc.stderr).trim();
  console.error(
    `[enforce-worktree] git exited ${gitProc.code} unexpectedly: ${stderr}`,
  );
  Deno.exit(2);
}

// Linked worktree has `.git` as a file (gitdir pointer); main has it as a directory.
const gitMarker = await statOrNull(`${repoRoot}/.git`);
if (gitMarker?.isFile) Deno.exit(0);

// ---- host carve-out: sandbox-management surface ----------------------------
// On macOS host, allow edits to sandbox plumbing on main worktree. Required to
// repair the sandbox when scripts/sandbox.ts (or flake.nix, or a hook) itself
// is broken — chicken-and-egg: without a working sandbox we can't EnterWorktree,
// and without a worktree this hook would block the fix. Mirrors deny-host.sh's
// Edit allowlist so the two layers stay in sync.

if (Deno.build.os === "darwin") {
  const rel = resolvedPath.startsWith(`${repoRoot}/`)
    ? resolvedPath.slice(repoRoot.length + 1)
    : resolvedPath;
  const allowPrefix = ["scripts/", ".claude/hooks/", "packages/mcp-ops/"];
  const allowExact = new Set(["flake.nix", "flake.lock"]);
  if (allowPrefix.some((p) => rel.startsWith(p)) || allowExact.has(rel)) {
    Deno.exit(0);
  }
}

// ---- extension allowlist ----------------------------------------------------

const ext = extLower(basename(resolvedPath));
if (ext && MAIN_EDIT_ALLOWED_EXTS.has(ext)) Deno.exit(0);

// ---- sentinel one-shot bypass ----------------------------------------------

try {
  await Deno.remove(SENTINEL);
  Deno.exit(0);
} catch {
  /* sentinel not present */
}

// ---- block ------------------------------------------------------------------

deny(
  `[enforce-worktree] About to edit "${filePath}" on the main worktree (${repoRoot}).

Per .claude/rules/general.md, application / test code edits must happen in a separate worktree. Use EnterWorktree before editing.

(Docs with allowlisted extensions — currently: ${[...MAIN_EDIT_ALLOWED_EXTS].join(" ")} — are permitted on main without ceremony. This file's extension isn't on that list.)

For a one-off trivial change to a non-allowlisted file: confirm with the user first, then run \`touch ${SENTINEL}\` and retry. The sentinel is one-shot and auto-consumed on the next edit.`,
);
