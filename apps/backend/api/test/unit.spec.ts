import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { createD1DB } from "@sho/db";
import { Job } from "@sho/models";
import { Arbitrary, Effect } from "effect";
import * as fc from "effect/FastCheck";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../src";
import { JobStoreDB } from "../src/cqrs";
import { InsertJobCommand } from "../src/cqrs/commands";

const MOCK_ENV = {
  ...env,
  API_KEY: "test-api-key",
};

const sampleJob = () => fc.sample(Arbitrary.make(Job), 1)[0];

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
describe("/jobs", () => {
  describe("GET 異常系", () => {
    it("with invalid query should fail", async () => {
      const request = new Request(
        "http://localhost:8787/jobs?employeeCountGt=notanumber",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
    it("with negative employeeCountGt should fail", async () => {
      const request = new Request(
        "http://localhost:8787/jobs?employeeCountGt=-1",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
    it("with invalid orderByReceiveDate should fail", async () => {
      const request = new Request(
        "http://localhost:8787/jobs?orderByReceiveDate=invalid",
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
  });
  describe("POST 正常系", () => {
    it("POST データを挿入できる", async () => {
      const request = new Request("http://localhost:8787/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify(sampleJob()),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
    });
  });
  describe("POST 異常系", () => {
    const insertingJob = sampleJob();
    beforeAll(async () => {
      const db = createD1DB(env.DB);
      await Effect.runPromise(
        Effect.gen(function* () {
          const cmd = yield* InsertJobCommand;
          return yield* cmd.run(insertingJob);
        }).pipe(
          Effect.provide(InsertJobCommand.Default),
          Effect.provideService(JobStoreDB, db),
        ),
      );
    });
    it("with duplicate jobNumber insertion failed.", async () => {
      const request = new Request("http://localhost:8787/jobs", {
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
      const request = new Request("http://localhost:8787/jobs", {
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
      const request = new Request("http://localhost:8787/jobs", {
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

describe("/jobs?page=N", () => {
  describe("GET 正常系", () => {
    it("page=1でデータを取得できる", async () => {
      const request = new Request("http://localhost:8787/jobs?page=1");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(1);
      expect(data.meta.totalPages).toBeGreaterThanOrEqual(0);
      expect(data.meta.totalCount).toBeGreaterThanOrEqual(0);
    });
  });
  describe("GET 異常系", () => {
    it("page=0は1として扱われる", async () => {
      const request = new Request("http://localhost:8787/jobs?page=0");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.meta.page).toBe(1);
    });
    it("page=notanumberは1として扱われる", async () => {
      const request = new Request("http://localhost:8787/jobs?page=notanumber");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.meta.page).toBe(1);
    });
  });
});

describe("/jobs/:jobNumber", () => {
  describe("GET 正常系", () => {
    const job = sampleJob();
    beforeAll(async () => {
      const db = createD1DB(env.DB);
      await Effect.runPromise(
        Effect.gen(function* () {
          const cmd = yield* InsertJobCommand;
          return yield* cmd.run(job);
        }).pipe(
          Effect.provide(InsertJobCommand.Default),
          Effect.provideService(JobStoreDB, db),
        ),
      );
    });
    it("jobNumberでデータを取得できる", async () => {
      const request = new Request(
        `http://localhost:8787/jobs/${job.jobNumber}`,
        { method: "GET" },
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
    });
  });
  describe("GET 異常系", () => {
    it("with too short format should fail", async () => {
      const request = new Request("http://localhost:8787/jobs/123-1");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
  });
});
