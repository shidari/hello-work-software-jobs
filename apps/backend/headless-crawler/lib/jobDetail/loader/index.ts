import type { InsertJobRequestBody } from "@sho/models";
import { Effect } from "effect";
import { buildJobStoreClient } from "./helper";

export class Loader extends Effect.Service<Loader>()("jobDetail/loader", {
  effect: Effect.gen(function* () {
    const client = yield* buildJobStoreClient();
    const load = Effect.fn("load")(function* (
      data: InsertJobRequestBody,
    ) {
      yield* Effect.logInfo("start loading job detail.");
      yield* client.insertJob(data);
    });
    return { load };
  }),
}) {}
