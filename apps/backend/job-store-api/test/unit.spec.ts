import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { Job as insertJobRequestBodySchema } from "@sho/models";
import { drizzle } from "drizzle-orm/d1";
import { Schema } from "effect";
import { beforeAll, describe, expect, it } from "vitest";
// Import your worker so you can unit test it
import worker from "../src";
import { createJobStoreDBClientAdapter } from "../src/adapters";

const MOCK_ENV = {
  ...env,
  API_KEY: "test-api-key",
};

describe("/", () => {
  describe("GET 正常系", () => {
    it("302リダイレクトとlocationを確認し、/docで200を確認する", async () => {
      const request = new Request("http://localhost:8787/");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toBe("/doc");
    });
  });
});
describe("/api/v1", () => {
  describe("GET 正常系", () => {
    it("302リダイレクトとlocationを確認し、/docで200を確認する", async () => {
      const request = new Request("http://localhost:8787/api/v1");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toBe("/doc");
    });
  });
});

describe("/api/v1/jobs", () => {
  describe("GET 異常系", () => {
    it("with invalid query should fail", async () => {
      const request = new Request(
        "http://localhost:8787/api/v1/jobs?employeeCountGt=notanumber",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      // バリデーションエラー時は400
      expect(response.status).toBe(400);
    });
    it("with negative employeeCountGt should fail", async () => {
      const request = new Request(
        "http://localhost:8787/api/v1/jobs?employeeCountGt=-1",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
    it("with invalid orderByReceiveDate should fail", async () => {
      const request = new Request(
        "http://localhost:8787/api/v1/jobs?orderByReceiveDate=invalid",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
  });
  describe("POST 正常系", () => {
    it("POST データを挿入できる", async () => {
      const request = new Request("http://localhost:8787/api/v1/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify({
          jobNumber: "54455-10912",
          companyName: "Tech Corp",
          jobDescription: "ソフトウェアエンジニアの募集です。",
          workPlace: "東京",
          wageMin: 50000000,
          wageMax: 80000000,
          employmentType: "正社員",
          workingStartTime: "09:00",
          workingEndTime: "18:00",
          receivedDate: "2024-06-01T00:00:00Z",
          expiryDate: "2024-12-31T00:00:00Z",
          employeeCount: 200,
          occupation: "IT",
          homePage: "https://techcorp.example.com",
          qualifications: " コンピュータサイエンスの学位、3年以上の経験",
        }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
    });
  });
  describe("POST 異常系", () => {
    const jobNumber = "52495-40218";
    const insertingJob = Schema.decodeUnknownSync(insertJobRequestBodySchema)({
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
    beforeAll(async () => {
      const db = drizzle(env.DB);
      const dbClient = createJobStoreDBClientAdapter(db);
      await dbClient.execute({
        type: "InsertJob",
        payload: insertingJob,
      });
    });
    it("with duplicate jobNumber insertion failed.", async () => {
      const request = new Request("http://localhost:8787/api/v1/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify(insertingJob),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(409);
    });
    it("with invalid API key should return 401", async () => {
      const request = new Request("http://localhost:8787/api/v1/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "invalid-key",
        },
        body: JSON.stringify({}),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(401);
    });
    it("with valid API key but invalid body should return 400", async () => {
      const request = new Request("http://localhost:8787/api/v1/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify({}),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
  });
});

describe("/api/v1/jobs/continue", () => {
  describe("GET 異常系", () => {
    it("without nextToken should fail", async () => {
      const request = new Request("http://localhost:8787/api/v1/jobs/continue");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
  });
});

describe("/api/v1/jobs/:jobNumber", () => {
  describe("GET 正常系", () => {
    const jobNumber = "24455-10912";
    beforeAll(async () => {
      const db = drizzle(env.DB);
      const dbClient = createJobStoreDBClientAdapter(db);
      const insertingJob = Schema.decodeUnknownSync(insertJobRequestBodySchema)(
        {
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
        },
      );
      await dbClient.execute({
        type: "InsertJob",
        payload: insertingJob,
      });
    });
    it("jobNumberでデータを取得できる", async () => {
      const request = new Request(
        `http://localhost:8787/api/v1/jobs/${jobNumber}`,
        {
          method: "GET",
        },
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
    });
  });
  describe("GET 異常系", () => {
    it("with too short format should fail", async () => {
      const request = new Request("http://localhost:8787/api/v1/jobs/123-1");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
  });
});
