import { Effect } from "effect";
import { etCrawlerEffect } from "..";
import {
  buildExtractorAndTransformerConfigLive,
  crawlerLive,
} from "../context";

async function main() {
  const runnable = etCrawlerEffect
    .pipe(Effect.provide(crawlerLive))
    .pipe(Effect.scoped)
    .pipe(
      Effect.provide(
        buildExtractorAndTransformerConfigLive({ logDebug: false }),
      ),
    );
  Effect.runPromise(runnable).then((jobNumbers) =>
    console.dir({ jobNumbers }, { depth: null }),
  );
}

main();
