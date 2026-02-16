import { Effect } from "effect";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Transformer } from "..";

async function main() {
  const rawHtml = await readFile(
    resolve("lib/T-jobDetail/playground/sample.html"),
    "utf-8",
  );
  const program = Effect.gen(function* () {
    const transformer = yield* Transformer;
    return yield* transformer.transform(rawHtml);
  });
  const runnable = program.pipe(Effect.provide(Transformer.Default));
  Effect.runPromise(runnable).then((jobInfo) =>
    console.dir({ ...jobInfo }, { depth: null }),
  );
}

main();
