import { Effect } from "effect";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { buildProgram } from "../transfomer";
import { transformerConfigLive, transformerLive } from "../context";

async function main() {
  const rawHtml = await readFile(
    resolve("lib/T-jobDetail/playground/sample.html"),
    "utf-8",
  );
  const program = buildProgram(rawHtml);
  // いまいち書き方がわかってない
  const runnable = program
    .pipe(Effect.provide(transformerLive))
    .pipe(Effect.provide(transformerConfigLive));
  Effect.runPromise(runnable).then((jobInfo) =>
    console.dir({ ...jobInfo }, { depth: null }),
  );
}

main();
