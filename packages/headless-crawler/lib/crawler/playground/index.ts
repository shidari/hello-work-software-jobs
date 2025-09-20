import { Effect } from "effect";
import { crawlerRunnable } from "..";

async function main() {
  Effect.runPromise(crawlerRunnable).then((jobNumbers) =>
    console.dir({ jobNumbers }, { depth: null }),
  );
}

main();
