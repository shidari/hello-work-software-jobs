import { Effect, Logger, LogLevel } from "effect";
import { etCrawlerEffect } from "..";
import { mainLive } from "../context";

async function main() {
  const runnable = etCrawlerEffect
    .pipe(Effect.provide(mainLive))
    .pipe(Effect.scoped)
    .pipe(Logger.withMinimumLogLevel(LogLevel.Debug));
  Effect.runPromise(runnable).then((jobNumbers) =>
    console.dir({ jobNumbers }, { depth: null }),
  );
}

main();
