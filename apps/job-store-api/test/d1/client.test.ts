import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { expect, it } from "vitest";
import { createJobStoreDBClientAdapter } from "../../src/adapters";
import { parse } from "valibot";
import { insertJobRequestBodySchema } from "@sho/models";
declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

it("求人データを挿入できる", async () => {
  const db = drizzle(env.DB);
  const dbClient = createJobStoreDBClientAdapter(db);
  const jobNumber = "64455-10912";
  const insertingJob = parse(insertJobRequestBodySchema, {
    jobNumber,
    companyName: "Tech Corp",
    jobDescription: "ソフトウェアエンジニアの募集です。",
    workPlace: "東京",
    wageMin: 50000000,
    wageMax: 80000000,
    employmentType: "正社員",
    workingStartTime: "09:00",
    workingEndTime: "18:00",
    receivedDate: "2024-06-01T12:34:56Z",
    expiryDate: "2024-12-31T23:59:59Z",
    employeeCount: 200,
    occupation: "IT",
    homePage: "https://techcorp.example.com",
    qualifications: " コンピュータサイエンスの学位、3年以上の経験",
  });
  const result = await dbClient.execute({
    type: "InsertJob",
    payload: insertingJob,

  });
  expect(result.success).toBe(true);
  const result2 = await dbClient.execute({
    type: "FindJobByNumber",
    jobNumber,
  });
  expect(result2.success).toBe(true);
  if (result2.success) {
    const returnedJobNumber = result2.job?.jobNumber;
    expect(returnedJobNumber).toEqual(jobNumber);
  }
});
