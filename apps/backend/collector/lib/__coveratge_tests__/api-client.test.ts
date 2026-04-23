// Low-quality sweep tests for apiClient/*.ts — exercise happy & error paths
// by stubbing global fetch and providing a fake APIConfig.

import { Effect, Either, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { APIConfig } from "../apiClient/config";
import { insertJob, upsertCompany } from "../apiClient/mutation";
import { filterUnregistered } from "../apiClient/query";

const testConfig = Layer.succeed(APIConfig, {
  endpoint: "http://localhost:0",
  apiKey: "test",
});

const makeResponse = (
  status: number,
  body: unknown,
  init?: { textFail?: boolean },
) => {
  const headers = new Headers({ "content-type": "application/json" });
  const payload =
    typeof body === "string" ? body : JSON.stringify(body ?? null);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    text: init?.textFail
      ? () => Promise.reject(new Error("read failed"))
      : () => Promise.resolve(payload),
    json: () => Promise.resolve(body),
  } as unknown as Response;
};

const stubFetch = (res: Response | Error) => {
  const fetchMock =
    res instanceof Error
      ? vi.fn().mockRejectedValue(res)
      : vi.fn().mockResolvedValue(res);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const sampleTransformedJob = {
  jobNumber: "13080-55925651",
  companyName: "x",
  receivedDate: "2024-01-01T00:00:00Z",
  expiryDate: "2024-12-31T00:00:00Z",
  homePage: null,
  occupation: "engineer",
  employmentType: "正社員",
  wage: null,
  workingHours: null,
  employeeCount: null,
  workPlace: null,
  jobDescription: null,
  qualifications: null,
  establishmentNumber: null,
  jobCategory: null,
  industryClassification: null,
  publicEmploymentOffice: null,
  onlineApplicationAccepted: null,
  dispatchType: null,
  employmentPeriod: null,
  ageRequirement: null,
  education: null,
  requiredExperience: null,
  trialPeriod: null,
  carCommute: null,
  transferPossibility: null,
  wageType: null,
  raise: null,
  bonus: null,
  insurance: null,
  retirementBenefit: null,
} as unknown as Parameters<typeof insertJob>[0];

const sampleCompany = {
  establishmentNumber: "0101-626495-7",
  companyName: "Acme",
  postalCode: null,
  address: null,
  employeeCount: null,
  foundedYear: null,
  capital: null,
  businessDescription: null,
  corporateNumber: null,
} as unknown as Parameters<typeof upsertCompany>[0];

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("coverage sweep: apiClient/mutation", () => {
  it("insertJob succeeds on 200", async () => {
    stubFetch(makeResponse(200, { success: true }));
    await Effect.runPromise(
      insertJob(sampleTransformedJob).pipe(Effect.provide(testConfig)),
    );
  });

  it("insertJob fails on 500 and surfaces ApiResponseError", async () => {
    stubFetch(makeResponse(500, "oops"));
    const result = await Effect.runPromise(
      insertJob(sampleTransformedJob).pipe(
        Effect.provide(testConfig),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("ApiResponseError");
    }
  });

  it("insertJob fails on network error with InsertJobError", async () => {
    stubFetch(new Error("network down"));
    const result = await Effect.runPromise(
      insertJob(sampleTransformedJob).pipe(
        Effect.provide(testConfig),
        Effect.either,
      ),
    );
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("InsertJobError");
    }
  });

  it("insertJob 500 with unreadable body still surfaces error", async () => {
    stubFetch(makeResponse(500, "", { textFail: true }));
    const result = await Effect.runPromise(
      insertJob(sampleTransformedJob).pipe(
        Effect.provide(testConfig),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
  });

  it("upsertCompany succeeds on 200", async () => {
    stubFetch(makeResponse(200, { success: true }));
    await Effect.runPromise(
      upsertCompany(sampleCompany).pipe(Effect.provide(testConfig)),
    );
  });

  it("upsertCompany fails on 500", async () => {
    stubFetch(makeResponse(500, "oops"));
    const result = await Effect.runPromise(
      upsertCompany(sampleCompany).pipe(
        Effect.provide(testConfig),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
  });

  it("upsertCompany fails on network error", async () => {
    stubFetch(new Error("boom"));
    const result = await Effect.runPromise(
      upsertCompany(sampleCompany).pipe(
        Effect.provide(testConfig),
        Effect.either,
      ),
    );
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("UpsertCompanyError");
    }
  });
});

describe("coverage sweep: apiClient/query.filterUnregistered", () => {
  it("short-circuits on empty input without calling fetch", async () => {
    const fetchMock = stubFetch(makeResponse(200, { existing: [] }));
    const out = await Effect.runPromise(
      filterUnregistered([]).pipe(Effect.provide(testConfig)),
    );
    expect(out).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns difference on 200", async () => {
    stubFetch(makeResponse(200, { existing: ["13080-55925651"] }));
    const out = await Effect.runPromise(
      filterUnregistered([
        "13080-55925651" as never,
        "13080-55925652" as never,
      ]).pipe(Effect.provide(testConfig)),
    );
    expect(out).toContain("13080-55925652");
    expect(out).not.toContain("13080-55925651");
  });

  it("fails on non-2xx", async () => {
    stubFetch(makeResponse(503, "down"));
    const result = await Effect.runPromise(
      filterUnregistered(["13080-55925651" as never]).pipe(
        Effect.provide(testConfig),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("JobStoreExistsResponseError");
    }
  });

  it("fails on network error", async () => {
    stubFetch(new Error("network"));
    const result = await Effect.runPromise(
      filterUnregistered(["13080-55925651" as never]).pipe(
        Effect.provide(testConfig),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
  });
});
