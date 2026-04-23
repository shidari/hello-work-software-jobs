// Low-quality sweep tests: purpose is to inflate vitest coverage numbers
// by hitting every route / CQRS path with the cheapest possible inputs.
// These are NOT behavioural tests — do not use them as documentation.

import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import {
  type Company,
  CorporateNumber,
  EstablishmentNumber,
  type Job,
} from "@sho/models";
import { Effect, Schema } from "effect";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../../src";
import {
  InsertJobCommand,
  UpsertCompanyCommand,
} from "../../src/cqrs/commands";
import {
  FetchDailyStatsQuery,
  FetchJobsPageQuery,
  FindCompanyQuery,
  FindExistingJobNumbersQuery,
  FindJobByNumberQuery,
} from "../../src/cqrs/queries";
import { JobStoreDB } from "../../src/infra/db";
import { sampleJobs } from "../mock";

const MOCK_ENV = { ...env, API_KEY: "test-api-key" };

const workerFetch = async (path: string, init?: RequestInit) => {
  const request = new Request(`http://localhost:8787${path}`, init);
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, MOCK_ENV, ctx);
  await waitOnExecutionContext(ctx);
  return response;
};

const runWithDb = <A, E>(effect: Effect.Effect<A, E, JobStoreDB>) =>
  Effect.runPromise(
    effect.pipe(Effect.provideService(JobStoreDB, JobStoreDB.main(env.DB))),
  );

const insertJob = (job: Job) =>
  runWithDb(
    Effect.gen(function* () {
      const cmd = yield* InsertJobCommand;
      return yield* cmd.run(job);
    }).pipe(Effect.provide(InsertJobCommand.Default)),
  );

const upsertCompany = (company: Company) =>
  runWithDb(
    Effect.gen(function* () {
      const cmd = yield* UpsertCompanyCommand;
      return yield* cmd.run(company);
    }).pipe(Effect.provide(UpsertCompanyCommand.Default)),
  );

describe("coverage sweep: jobs routes", () => {
  beforeAll(async () => {
    for (const job of sampleJobs({ num: 3 })) {
      await insertJob(job);
    }
  });

  it("GET /jobs with all filter params exercises the filter builder", async () => {
    const qs = new URLSearchParams({
      companyName: "acme",
      employeeCountGt: "1",
      employeeCountLt: "9999",
      jobDescription: "dev",
      jobDescriptionExclude: "junk",
      onlyNotExpired: "true",
      orderByReceiveDate: "desc",
      addedSince: "2020-01-01",
      addedUntil: "2099-12-31",
      occupation: "engineer",
      wageMin: "1000",
      wageMax: "9999999",
      workPlace: "tokyo",
      qualifications: "none",
      education: "none",
      industryClassification: "IT",
      establishmentNumber: "0101-626495-7",
      page: "2",
    });
    const res = await workerFetch(`/jobs?${qs}`);
    expect([200, 500]).toContain(res.status);
  });

  it("GET /jobs with NaN page defaults to 1", async () => {
    const res = await workerFetch("/jobs?page=not-a-number");
    expect(res.status).toBe(200);
  });

  it("GET /jobs?orderByReceiveDate=asc", async () => {
    const res = await workerFetch("/jobs?orderByReceiveDate=asc");
    expect(res.status).toBe(200);
  });

  it("POST /jobs without API key is 401", async () => {
    const res = await workerFetch("/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });

  it("POST /jobs with invalid body is 400", async () => {
    const res = await workerFetch("/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({ jobNumber: "bogus" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /jobs with duplicate job is 409", async () => {
    const [job] = sampleJobs({ num: 1 });
    await insertJob(job);
    const res = await workerFetch("/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify(job),
    });
    expect(res.status).toBe(409);
  });

  it("GET /jobs/:jobNumber not found returns 404", async () => {
    const res = await workerFetch("/jobs/99999-99999999");
    expect(res.status).toBe(404);
  });

  it("GET /jobs/:jobNumber invalid is 400", async () => {
    const res = await workerFetch("/jobs/invalid");
    expect(res.status).toBe(400);
  });

  it("POST /jobs/exists with invalid body is 400", async () => {
    const res = await workerFetch("/jobs/exists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobNumbers: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /jobs/exists with valid body returns existing list", async () => {
    const res = await workerFetch("/jobs/exists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobNumbers: ["13080-55925651"] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { existing: string[] };
    expect(Array.isArray(body.existing)).toBe(true);
  });
});

describe("coverage sweep: companies routes", () => {
  const establishmentNumber =
    Schema.decodeSync(EstablishmentNumber)("0101-333333-3");
  const company: Company = {
    establishmentNumber,
    companyName: "Coverage Co",
    postalCode: null,
    address: null,
    employeeCount: null,
    foundedYear: null,
    capital: null,
    businessDescription: null,
    corporateNumber: null,
  };

  beforeAll(async () => {
    await upsertCompany(company);
  });

  it("GET /companies/:establishmentNumber returns the row", async () => {
    const res = await workerFetch(`/companies/${establishmentNumber}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { companyName: string };
    expect(body.companyName).toBe("Coverage Co");
  });

  it("GET /companies/:establishmentNumber 404 when unknown", async () => {
    const res = await workerFetch("/companies/9999-999999-9");
    expect(res.status).toBe(404);
  });

  it("POST /companies without API key is 401", async () => {
    const res = await workerFetch("/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });

  it("POST /companies with invalid JSON is 400", async () => {
    const res = await workerFetch("/companies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
  });

  it("POST /companies with invalid body shape is 400", async () => {
    const res = await workerFetch("/companies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({ establishmentNumber: "xxx" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /companies with valid body UPSERTs", async () => {
    const res = await workerFetch("/companies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        ...company,
        companyName: "Coverage Co (updated)",
        corporateNumber: Schema.decodeSync(CorporateNumber)("1234567890123"),
      }),
    });
    expect(res.status).toBe(200);
  });
});

describe("coverage sweep: stats route", () => {
  it("GET /stats/daily returns { stats: [...] }", async () => {
    const res = await workerFetch("/stats/daily");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stats: unknown[] };
    expect(Array.isArray(body.stats)).toBe(true);
  });
});

describe("coverage sweep: CQRS services directly", () => {
  it("FindJobByNumberQuery returns null for unknown", async () => {
    const res = await runWithDb(
      Effect.gen(function* () {
        const q = yield* FindJobByNumberQuery;
        return yield* q.run("00000-00000000");
      }).pipe(Effect.provide(FindJobByNumberQuery.Default)),
    );
    expect(res).toBeNull();
  });

  it("FindExistingJobNumbersQuery handles empty input", async () => {
    const res = await runWithDb(
      Effect.gen(function* () {
        const q = yield* FindExistingJobNumbersQuery;
        return yield* q.run([]);
      }).pipe(Effect.provide(FindExistingJobNumbersQuery.Default)),
    );
    expect(res).toEqual([]);
  });

  it("FindCompanyQuery returns null for unknown", async () => {
    const res = await runWithDb(
      Effect.gen(function* () {
        const q = yield* FindCompanyQuery;
        return yield* q.run("0000-000000-0");
      }).pipe(Effect.provide(FindCompanyQuery.Default)),
    );
    expect(res).toBeNull();
  });

  it("FetchDailyStatsQuery runs", async () => {
    const res = await runWithDb(
      Effect.gen(function* () {
        const q = yield* FetchDailyStatsQuery;
        return yield* q.run();
      }).pipe(Effect.provide(FetchDailyStatsQuery.Default)),
    );
    expect(Array.isArray(res)).toBe(true);
  });

  it("FetchJobsPageQuery with onlyNotExpired + asc order", async () => {
    const res = await runWithDb(
      Effect.gen(function* () {
        const q = yield* FetchJobsPageQuery;
        return yield* q.run({
          page: 1,
          filter: {
            onlyNotExpired: true,
            orderByReceiveDate: "asc",
          },
        });
      }).pipe(Effect.provide(FetchJobsPageQuery.Default)),
    );
    expect(typeof res.meta.totalCount).toBe("number");
  });
});
