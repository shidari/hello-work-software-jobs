import { env } from "cloudflare:test";
import { Job } from "@sho/models";
import { Arbitrary, Effect } from "effect";
import * as fc from "effect/FastCheck";
import { expect, it } from "vitest";
import { InsertJobCommand } from "../../src/cqrs/commands";
import { FindJobByNumberQuery } from "../../src/cqrs/queries";
import { JobStoreDB } from "../../src/infra/db";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

const sampleJob = () => fc.sample(Arbitrary.make(Job), 1)[0];

it("求人データを挿入できる", async () => {
  const db = JobStoreDB.main(env.DB);
  const insertingJob = sampleJob();

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const cmd = yield* InsertJobCommand;
      return yield* cmd.run(insertingJob);
    }).pipe(
      Effect.provide(InsertJobCommand.Default),
      Effect.provideService(JobStoreDB, db),
    ),
  );
  expect(result.jobNumber).toEqual(insertingJob.jobNumber);

  const result2 = await Effect.runPromise(
    Effect.gen(function* () {
      const query = yield* FindJobByNumberQuery;
      return yield* query.run(insertingJob.jobNumber);
    }).pipe(
      Effect.provide(FindJobByNumberQuery.Default),
      Effect.provideService(JobStoreDB, db),
    ),
  );
  expect(result2).not.toBeNull();
  expect(result2?.jobNumber).toEqual(insertingJob.jobNumber);
});
