import { Effect } from "effect";
import { buildScrapingResult } from "../scraper";

async function main() {
  const jobNumber = "01010-24871951";
  const runnable = buildScrapingResult(jobNumber);
  Effect.runPromise(runnable).then((jobInfo) =>
    console.dir({ ...jobInfo }, { depth: null }),
  );
}

main();
