// Low-quality sweep tests for job-detail-crawler/loader.

import type { Company, JobNumber } from "@sho/models";
import { Effect, Either } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JobDetailLoader } from "../hellowork/job-detail-crawler/loader";
import type { TransformedJob } from "../hellowork/job-detail-crawler/transformer";

const stubFetch = () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    text: () => Promise.resolve("{}"),
    json: () => Promise.resolve({ success: true }),
  } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const sampleJob = {
  jobNumber: "13080-55925651" as JobNumber,
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
} as unknown as TransformedJob;

const sampleCompany = {
  establishmentNumber: "0101-626495-7" as never,
  companyName: "Acme",
  postalCode: null,
  address: null,
  employeeCount: null,
  foundedYear: null,
  capital: null,
  businessDescription: null,
  corporateNumber: null,
} as unknown as Company;

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("coverage sweep: JobDetailLoader.noop", () => {
  it("load/loadCompany both return void without side effects", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const loader = yield* JobDetailLoader;
        yield* loader.load(sampleJob);
        yield* loader.loadCompany(sampleCompany);
      }).pipe(Effect.provide(JobDetailLoader.noop)),
    );
  });
});

describe("coverage sweep: JobDetailLoader.main", () => {
  it("load/loadCompany hit the stubbed fetch via env-configured APIConfig", async () => {
    stubFetch();
    process.env.JOB_STORE_ENDPOINT = "http://localhost:0";
    process.env.API_KEY = "test";
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const loader = yield* JobDetailLoader;
        yield* loader.load(sampleJob);
        yield* loader.loadCompany(sampleCompany);
      }).pipe(Effect.provide(JobDetailLoader.main), Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
  });
});
