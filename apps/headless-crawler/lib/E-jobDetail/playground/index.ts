import { Effect } from "effect";
import { ConfigLive, extractorLive } from "../context";
import { buildProgram } from "..";
import type { JobNumber } from "@sho/models";

async function main() {
  const jobNumber = "01010-24871951" as JobNumber;
  const program = buildProgram(jobNumber);
  // いまいち書き方がわかってない
  const runnable = program
    .pipe(Effect.provide(extractorLive))
    .pipe(Effect.provide(ConfigLive))
    // これ、使い方わかってない、なんとなく、playwrightのclose処理に必要なRequirementなのかなと
    .pipe(Effect.scoped);
  Effect.runPromise(runnable).then((jobInfo) =>
    console.dir({ ...jobInfo }, { depth: null }),
  );
}
main();
