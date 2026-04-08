import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import type { Job } from "@sho/models";
import { Effect, Schema } from "effect";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../src";
import { jobListSuccessResponseSchema } from "../src/app/jobs";
import { InsertJobCommand } from "../src/cqrs/commands";
import { JobStoreDB } from "../src/infra/db";
import { sampleJobs } from "./mock";

const MOCK_ENV = {
  ...env,
  API_KEY: "test-api-key",
};

const insertJob = (job: Job) => {
  const db = JobStoreDB.main(env.DB);
  return Effect.runPromise(
    Effect.gen(function* () {
      const cmd = yield* InsertJobCommand;
      return yield* cmd.run(job);
    }).pipe(
      Effect.provide(InsertJobCommand.Default),
      Effect.provideService(JobStoreDB, db),
    ),
  );
};

const workerFetch = async (path: string, init?: RequestInit) => {
  const request = new Request(`http://localhost:8787${path}`, init);
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, MOCK_ENV, ctx);
  await waitOnExecutionContext(ctx);
  return response;
};

// --- リダイレクト ---

describe("リダイレクト", () => {
  it("/ → /doc に 302 リダイレクト", async () => {
    const response = await workerFetch("/");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/doc");
  });
});

// --- 求人一覧 ---

describe("求人一覧", () => {
  // PAGE_SIZE(20) 件を登録
  beforeAll(async () => {
    for (const job of sampleJobs({ num: 20 })) {
      await insertJob(job);
    }
  });

  it("一覧を取得できる", async () => {
    const response = await workerFetch("/jobs");
    expect(response.status).toBe(200);
    const data = Schema.decodeUnknownSync(jobListSuccessResponseSchema)(
      await response.json(),
    );
    expect(data.meta.totalCount).toBeGreaterThanOrEqual(20);
  });

  it("雇用形態で絞り込める", async () => {
    // フィルタなしの全件数を取得
    const allResponse = await workerFetch("/jobs");
    const allData = Schema.decodeUnknownSync(jobListSuccessResponseSchema)(
      await allResponse.json(),
    );

    // 正社員でフィルタリングし、結果が全て正社員であること・全件より少ないことを確認
    const response = await workerFetch("/jobs?employmentType=正社員");
    expect(response.status).toBe(200);
    const data = Schema.decodeUnknownSync(jobListSuccessResponseSchema)(
      await response.json(),
    );
    expect(data.jobs.every((j) => j.employmentType === "正社員")).toBe(true);
    expect(data.meta.totalCount).toBeGreaterThanOrEqual(1);
    expect(data.meta.totalCount).toBeLessThan(allData.meta.totalCount);
  });

  describe("ページネーション", () => {
    // 追加で PAGE_SIZE(20) 件登録 → 累計 40 件以上で 2 ページ以上になる
    beforeAll(async () => {
      for (const job of sampleJobs({ num: 20 })) {
        await insertJob(job);
      }
    });

    it("2ページ目が取得できる", async () => {
      const response = await workerFetch("/jobs?page=2");
      expect(response.status).toBe(200);
      const data = Schema.decodeUnknownSync(jobListSuccessResponseSchema)(
        await response.json(),
      );
      expect(data.meta.totalPages).toBeGreaterThanOrEqual(2);
      expect(data.jobs.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// --- 求人登録 ---

describe("求人登録", () => {
  it("データを挿入できる", async () => {
    const [job] = sampleJobs({ num: 1 });
    const response = await workerFetch("/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify(job),
    });
    expect(response.status).toBe(200);
  });

  it("重複するデータは登録できない", async () => {
    const [job] = sampleJobs({ num: 1 });
    await insertJob(job);
    const response = await workerFetch("/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify(job),
    });
    expect(response.status).toBe(409);
  });

  it("不正な API key では登録できない", async () => {
    const response = await workerFetch("/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "invalid-key",
      },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(401);
  });

  it("不正なリクエストボディでは登録できない", async () => {
    const response = await workerFetch("/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });
});

// --- 求人詳細 ---

describe("求人詳細", () => {
  it("求人番号で取得できる", async () => {
    const [job] = sampleJobs({ num: 1 });
    await insertJob(job);
    const response = await workerFetch(`/jobs/${job.jobNumber}`);
    expect(response.status).toBe(200);
  });
});
