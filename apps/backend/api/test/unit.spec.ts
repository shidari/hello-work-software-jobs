import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import type { Job } from "@sho/models";
import { Effect, Schema } from "effect";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../src";
import {
  jobListSuccessResponseSchema,
  jobsExistsSuccessResponseSchema,
} from "../src/app/jobs";
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

// --- 求人番号の存在確認 ---

describe("求人番号の存在確認", () => {
  it("登録済みの求人番号のみが existing に含まれる", async () => {
    const [registered, unregistered] = sampleJobs({ num: 2 });
    await insertJob(registered);

    const response = await workerFetch("/jobs/exists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobNumbers: [registered.jobNumber, unregistered.jobNumber],
      }),
    });

    expect(response.status).toBe(200);
    const data = Schema.decodeUnknownSync(jobsExistsSuccessResponseSchema)(
      await response.json(),
    );
    expect(data.existing).toContain(registered.jobNumber);
    expect(data.existing).not.toContain(unregistered.jobNumber);
  });

  it("全件未登録なら existing は空配列", async () => {
    const [job] = sampleJobs({ num: 1 });
    const response = await workerFetch("/jobs/exists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobNumbers: [job.jobNumber] }),
    });
    expect(response.status).toBe(200);
    const data = Schema.decodeUnknownSync(jobsExistsSuccessResponseSchema)(
      await response.json(),
    );
    expect(data.existing).toEqual([]);
  });

  it("空配列は 400 を返す", async () => {
    const response = await workerFetch("/jobs/exists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobNumbers: [] }),
    });
    expect(response.status).toBe(400);
  });

  it("不正な形式の求人番号を含むと 400 を返す", async () => {
    const response = await workerFetch("/jobs/exists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobNumbers: ["invalid"] }),
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

// --- セキュリティ ---

describe("セキュリティ", () => {
  it("レスポンスにセキュリティヘッダーが含まれる", async () => {
    const response = await workerFetch("/jobs");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("レート制限を超えると 429 を返す", async () => {
    // まず1回リクエストしてテーブルを確実に作成
    await workerFetch("/jobs");
    // トークンを枯渇させて refill されないよう last_refill を現在時刻に
    const db = MOCK_ENV.DB;
    await db
      .prepare(
        "UPDATE _rate_limit SET tokens = -100, last_refill = datetime('now') WHERE id = 'global'",
      )
      .run();
    const response = await workerFetch("/jobs");
    expect(response.status).toBe(429);
  });

  it("LIKE ワイルドカードがエスケープされる", async () => {
    const response = await workerFetch("/jobs?companyName=%25%25%25");
    expect(response.status).toBe(200);
    const data = await response.json();
    // %%% はリテラル文字として扱われるため結果は 0 件
    expect(data.meta.totalCount).toBe(0);
  });

  it("Companies POST に不正な JSON を送ると 400 を返す", async () => {
    const response = await workerFetch("/companies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: "{broken",
    });
    expect(response.status).toBe(400);
  });
});
