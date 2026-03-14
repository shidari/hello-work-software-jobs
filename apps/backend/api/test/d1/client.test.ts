import { env } from "cloudflare:test";
import { createD1DB } from "@sho/db";
import { Job as insertJobRequestBodySchema } from "@sho/models";
import { Effect, Schema } from "effect";
import { expect, it } from "vitest";
import { JobStoreDB } from "../../src/cqrs";
import { InsertJobCommand } from "../../src/cqrs/commands";
import { FindJobByNumberQuery } from "../../src/cqrs/queries";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

it("求人データを挿入できる", async () => {
  const db = createD1DB(env.DB);
  const jobNumber = "64455-10912";
  const insertingJob = Schema.decodeUnknownSync(insertJobRequestBodySchema)({
    jobNumber,
    companyName: "Tech Corp",
    jobDescription: "ソフトウェアエンジニアの募集です。",
    workPlace: "東京",
    wage: { min: 50000000, max: 80000000 },
    employmentType: "正社員",
    workingHours: { start: "09:00:00", end: "18:00:00" },
    receivedDate: "2024-06-01T12:34:56Z",
    expiryDate: "2024-12-31T23:59:59Z",
    employeeCount: 200,
    occupation: "IT",
    homePage: "https://techcorp.example.com",
    qualifications: " コンピュータサイエンスの学位、3年以上の経験",
  });

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const cmd = yield* InsertJobCommand;
      return yield* cmd.run(insertingJob);
    }).pipe(
      Effect.provide(InsertJobCommand.Default),
      Effect.provideService(JobStoreDB, db),
    ),
  );
  expect(result.jobNumber).toEqual(jobNumber);

  const result2 = await Effect.runPromise(
    Effect.gen(function* () {
      const query = yield* FindJobByNumberQuery;
      return yield* query.run(jobNumber);
    }).pipe(
      Effect.provide(FindJobByNumberQuery.Default),
      Effect.provideService(JobStoreDB, db),
    ),
  );
  expect(result2).not.toBeNull();
  expect(result2?.jobNumber).toEqual(jobNumber);
});
