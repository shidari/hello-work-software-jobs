import { readdir, stat, statfs } from "node:fs/promises";
import { join } from "node:path";

const TMP_DIR = "/tmp";

const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

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
