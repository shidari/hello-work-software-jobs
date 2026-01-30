import { Effect } from "effect";
import { HelloWorkCrawler } from "./context";

export const etCrawlerEffect = Effect.gen(function* () {
  const helloWorkCrawler = yield* HelloWorkCrawler;
  const result = yield* helloWorkCrawler.crawlJobLinks();
  return result;
});
