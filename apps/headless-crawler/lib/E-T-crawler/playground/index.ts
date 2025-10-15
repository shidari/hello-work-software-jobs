import { Effect } from "effect";
import { etCrawlerEffect } from "..";
import {
  buildMainLive,
} from "../context";

async function main() {
  const runnable = etCrawlerEffect
    .pipe(Effect.provide(buildMainLive({ logDebug: true })))
    .pipe(Effect.scoped)
  Effect.runPromise(runnable).then((jobNumbers) =>
    console.dir({ jobNumbers }, { depth: null }),
  );
}

main();
