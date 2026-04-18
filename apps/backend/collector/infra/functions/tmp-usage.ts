import { writeFileSync } from "node:fs";
import { readdir, rm, stat, statfs } from "node:fs/promises";
import { join } from "node:path";
import { Effect } from "effect";

const TMP_DIR = "/tmp";

const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

// handler 開始時に呼ぶ。子プロセス（Chromium）に継承され kernel の core dump 生成を抑止する。
// Chromium の --disable-breakpad は自前クラッシュレポーターを止めるだけで kernel が吐く core.* は別物。
export const disableCoreDump = Effect.try({
  try: () => writeFileSync("/proc/self/coredump_filter", "0"),
  catch: (e) => e,
}).pipe(
  Effect.catchAll((e) =>
    Effect.logWarning("disableCoreDump failed").pipe(
      Effect.annotateLogs({
        error:
          e instanceof Error
            ? { name: e.name, message: e.message, stack: e.stack }
            : { message: String(e) },
      }),
    ),
  ),
);

// core.* を対象に含めるのは Chromium のコアダンプが 1 個 1GB 級で /tmp を枯渇させるため。
export const cleanupTmp = Effect.tryPromise({
  try: async () => {
    for (const entry of await readdir(TMP_DIR)) {
      if (entry.startsWith("playwright") || entry.startsWith("core.")) {
        await rm(join(TMP_DIR, entry), { recursive: true, force: true });
      }
    }
  },
  catch: (e) => e,
}).pipe(
  Effect.catchAll((e) =>
    Effect.logError("cleanup /tmp failed").pipe(
      Effect.annotateLogs({
        error:
          e instanceof Error
            ? { name: e.name, message: e.message, stack: e.stack }
            : { message: String(e) },
      }),
    ),
  ),
);

export async function logTmpUsage(label: string): Promise<void> {
  try {
    const [fs, entries] = await Promise.all([
      statfs(TMP_DIR),
      readdir(TMP_DIR, { withFileTypes: true }),
    ]);

    const totalMB = toMB(fs.blocks * fs.bsize);
    const availableMB = toMB(fs.bavail * fs.bsize);

    // /tmp 直下のエントリだけサイズ取得（再帰しない）
    const topLevel = await Promise.all(
      entries.map(async (entry) => {
        try {
          const s = await stat(join(TMP_DIR, entry.name));
          return { path: entry.name, sizeMB: toMB(s.size) };
        } catch {
          return { path: entry.name, sizeMB: 0 };
        }
      }),
    );

    const sorted = topLevel.sort((a, b) => b.sizeMB - a.sizeMB).slice(0, 5);

    console.log(
      JSON.stringify({
        label,
        tmpUsage: { totalMB, availableMB, entries: sorted },
      }),
    );
  } catch (e) {
    console.log(JSON.stringify({ label, tmpUsageError: String(e) }));
  }
}
