import type { InsertJobRequestBody } from "@sho/models";
import { Config, Effect } from "effect";
import { InsertJobError } from "./error";

export function buildJobStoreClient() {
  return Effect.gen(function* () {
    const endpoint = yield* Config.string("JOB_STORE_ENDPOINT");
    return {
      insertJob: (job: InsertJobRequestBody) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(
            `executing insert job api. job=${JSON.stringify(job, null, 2)}`,
          );
          const res = yield* Effect.tryPromise({
            try: async () =>
              fetch(`${endpoint}/job`, {
                method: "POST",
                body: JSON.stringify(job),
                headers: {
                  "content-type": "application/json",
                  "x-api-key": process.env.API_KEY ?? "",
                },
              }),
            catch: (e) =>
              new InsertJobError({
                message: `insert job response failed.\n${e instanceof Error ? e.message : String(e)}`,
              }),
          });
          const data = yield* Effect.tryPromise({
            try: () => res.json(),
            catch: (e) =>
              new InsertJobError({
                message: `insert job transforming json failed.\n${e instanceof Error ? e.message : String(e)}`,
              }),
          });
          if (!res.ok) {
            throw new InsertJobError({
              message: `insert job failed.\nstatus=${res.status}\nstatusText=${res.statusText}\nmessage=${JSON.stringify(data, null, 2)}`,
            });
          }

          yield* Effect.logDebug(
            `response data. ${JSON.stringify(data, null, 2)}`,
          );
        }),
    };
  });
}
