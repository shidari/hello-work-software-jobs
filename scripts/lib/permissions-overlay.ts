// .claude/settings.local.json の host/container 分離。
// 実体を .claude/permissions/settings.local.json に逃がし、.claude/settings.local.json
// を相対 symlink にする。container 側は permissions/ ディレクトリを bind mount で
// 空 {} にすり替える。詳細は .claude/rules/cli.md。

const FILENAME = "settings.local.json";

export type OverlayPlan = {
  /** $STATE/claude-permissions — container 側で空 {} を見せるための overlay 源 */
  overlayDir: string;
  /** $REPO/.claude/permissions/settings.local.json — host 側で実体が居る場所 */
  hostFile: string;
  /** $REPO/.claude/settings.local.json — 相対 symlink。host も container もここを読む */
  symlinkAt: string;
};

/**
 * Symlink + 実ファイル + overlay 源を idempotent に揃える。
 * ambiguous state (regular file と permissions/ 内 file が両方存在) は throw して
 * 呼び出し側に修正を要求する (silently 片方選ぶと host の allow list を container
 * に漏らしかねないため)。
 */
export async function ensureOverlayLayout(
  paths: { repo: string; state: string },
): Promise<OverlayPlan> {
  const { repo, state } = paths;
  const overlayDir = `${state}/claude-permissions`;
  const permissionsHostDir = `${repo}/.claude/permissions`;
  const hostFile = `${permissionsHostDir}/${FILENAME}`;
  const symlinkAt = `${repo}/.claude/${FILENAME}`;
  const symlinkTarget = `permissions/${FILENAME}`;

  await Deno.mkdir(overlayDir, { recursive: true });
  const overlayFile = `${overlayDir}/${FILENAME}`;
  if (!await pathExists(overlayFile)) {
    await Deno.writeTextFile(overlayFile, "{}\n");
  }

  await Deno.mkdir(permissionsHostDir, { recursive: true });

  const lstat = await Deno.lstat(symlinkAt).catch(() => null);
  const isSymlink = lstat?.isSymlink ?? false;
  const isRegular = lstat?.isFile ?? false;
  const hostFileExists = await pathExists(hostFile);

  if (isRegular) {
    if (hostFileExists) {
      throw new Error(
        `Both ${symlinkAt} and ${hostFile} exist. Aborting to avoid leaking host's ` +
          `project-level allow list into the container.\n` +
          `Inspect both, remove the stale one, then re-run:\n` +
          `  diff ${symlinkAt} ${hostFile}`,
      );
    }
    await Deno.rename(symlinkAt, hostFile);
    await Deno.symlink(symlinkTarget, symlinkAt);
  } else if (!lstat) {
    if (!hostFileExists) {
      await Deno.writeTextFile(hostFile, "{}\n");
    }
    await Deno.symlink(symlinkTarget, symlinkAt);
  } else if (isSymlink) {
    // 既に symlink: idempotent に no-op。target が壊れている場合だけ host file を補う
    if (!hostFileExists) {
      await Deno.writeTextFile(hostFile, "{}\n");
    }
  }

  return { overlayDir, hostFile, symlinkAt };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}
