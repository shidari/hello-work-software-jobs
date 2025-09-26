import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it } from "vitest";
// Import your worker so you can unit test it
import worker from "../src";
import { createJobStoreResultBuilder } from "../src/clientImpl";
import { createJobStoreDBClientAdapter } from "../src/clientImpl/adapter";

const MOCK_ENV = {
  ...env,
  API_KEY: "test-api-key",
};

describe("/", () => {
  describe("正常系", () => {
    it("GET 302リダイレクトとlocationを確認し、/docで200を確認する", async () => {
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

describe("/api/v1/jobs", () => {
  describe("GET 正常系", () => {
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
  describe("GET 異常系", () => {
    it("GET with invalid query should fail", async () => {
      const request = new Request(
        "http://localhost:8787/api/v1/jobs?employeeCountGt=notanumber",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      // バリデーションエラー時は400
      expect(response.status).toBe(400);
    });
    it("GET with negative employeeCountGt should fail", async () => {
      const request = new Request(
        "http://localhost:8787/api/v1/jobs?employeeCountGt=-1",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
    it("GET with invalid orderByReceiveDate should fail", async () => {
      const request = new Request(
        "http://localhost:8787/api/v1/jobs?orderByReceiveDate=invalid",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
    it("POST with invalid API key should return 401", async () => {
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
    it("POST with valid API key but invalid body should return 400", async () => {
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
    it("GET without nextToken should fail", async () => {
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
      const jobStore = createJobStoreResultBuilder(dbClient);
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
      await jobStore.insertJob(insertingJob);
    });

    it("GET jobNumberでデータを取得できる", async () => {
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
    it("GET with too short format should fail", async () => {
      const request = new Request("http://localhost:8787/api/v1/jobs/123-1");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
  });
});
