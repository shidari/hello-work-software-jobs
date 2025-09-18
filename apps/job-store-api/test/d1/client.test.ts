import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { expect, it } from "vitest";
import { createJobStoreResultBuilder } from "../../src/clientImpl";
import { createJobStoreDBClientAdapter } from "../../src/clientImpl/adapter";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

it("求人データを挿入できる", async () => {
  const db = drizzle(env.DB);
  const dbClient = createJobStoreDBClientAdapter(db);
  const jobStore = createJobStoreResultBuilder(dbClient);
  const jobNumber = "64455-10912";
  const insertingJob = {
    jobNumber,
    companyName: "Tech Corp",
    jobDescription: "ソフトウェアエンジニアの募集です。",
    workPlace: "東京",
    wageMin: 50000000,
    wageMax: 80000000,
    employmentType: "正社員",
    workingStartTime: "09:00",
    workingEndTime: "18:00",
    receivedDate: "2024-06-01",
    expiryDate: "2024-12-31",
    employeeCount: 200,
    occupation: "IT",
    homePage: "https://techcorp.example.com",
    qualifications: " コンピュータサイエンスの学位、3年以上の経験",
  };
  const result = await jobStore.insertJob(insertingJob);
  if (result.isErr()) {
    console.error(result.error);
  }
  expect(result.isOk()).toBe(true);
  const result2 = await jobStore.fetchJob(jobNumber);
  if (result2.isErr()) {
    console.error(result2.error);
  }
  expect(result2.isOk()).toBe(true);
  const returnedJobNumber = result2._unsafeUnwrap()?.jobNumber;
  expect(returnedJobNumber).toEqual(jobNumber);
});
