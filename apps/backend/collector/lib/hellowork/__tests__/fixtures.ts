import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Data, Effect } from "effect";
import type { PageSnapshot } from "../browser";

export class FixtureLoadError extends Data.TaggedError("FixtureLoadError")<{
  readonly reason: string;
  readonly error?: Error;
}> {}

type ManifestEntry = { readonly url: string; readonly file: string };

// 指定 dir 配下の manifest.json と HTML ファイルを読み、PageSnapshot[] を返す。
// fixture ディレクトリ規約:
//   {dir}/manifest.json  — [{ url, file }] の配列
//   {dir}/{file}         — manifest 内の各 entry に対応する HTML
export const loadFixtures = (
  dir: string,
): Effect.Effect<readonly PageSnapshot[], FixtureLoadError> =>
  Effect.tryPromise({
    try: async () => {
      const manifestRaw = await readFile(
        resolve(dir, "manifest.json"),
        "utf-8",
      );
      const manifest = JSON.parse(manifestRaw) as readonly ManifestEntry[];
      return Promise.all(
        manifest.map(
          async (entry): Promise<PageSnapshot> => ({
            url: entry.url,
            html: await readFile(resolve(dir, entry.file), "utf-8"),
          }),
        ),
      );
    },
    catch: (e) =>
      new FixtureLoadError({
        reason: `failed to load fixtures from ${dir}`,
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
