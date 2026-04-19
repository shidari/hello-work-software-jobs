import type { hc, InferResponseType } from "hono/client";
import type { AppType } from "./backend-client";

type Client = ReturnType<typeof hc<AppType>>;
type JobListResponse = InferResponseType<Client["jobs"]["$get"], 200>;
export type JobDetailResponse = InferResponseType<
  Client["jobs"][":jobNumber"]["$get"],
  200
>;
export type CompanyResponse = InferResponseType<
  Client["companies"][":establishmentNumber"]["$get"],
  200
>;
// --- モックデータ ---

const baseJob: JobDetailResponse = {
  jobNumber: "13010-00000001",
  companyName: "株式会社テスト",
  receivedDate: "2026-04-01T00:00:00Z",
  expiryDate: "2026-06-30T00:00:00Z",
  homePage: null,
  occupation: "ソフトウェアエンジニア",
  employmentType: "正社員",
  wage: { min: 300000, max: 500000 },
  workingHours: { start: "09:00:00", end: "18:00:00" },
  employeeCount: 100,
  workPlace: "東京都渋谷区",
  jobDescription: "Webアプリケーションの開発・運用を担当していただきます。",
  qualifications: null,
  establishmentNumber: null,
  jobCategory: "フルタイム",
  industryClassification: "情報通信業",
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
  wageType: "月給",
  raise: null,
  bonus: null,
  insurance: "雇用保険、労災保険、健康保険、厚生年金",
  retirementBenefit: null,
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

const companies = [
  "株式会社テスト",
  "合同会社サンプル",
  "有限会社横浜テック",
  "株式会社大阪システムズ",
  "合同会社名古屋ラボ",
];
const occupations = [
  "ソフトウェアエンジニア",
  "バックエンドエンジニア",
  "フロントエンドエンジニア",
  "インフラエンジニア",
  "一般事務",
];
const places = [
  "東京都渋谷区",
  "大阪府大阪市北区",
  "神奈川県横浜市",
  "愛知県名古屋市",
  "福岡県福岡市",
];
const types: string[] = ["正社員", "正社員以外", "パート労働者"];

export const mockJobs: JobDetailResponse[] = Array.from(
  { length: 25 },
  (_, i) => ({
    ...baseJob,
    jobNumber: `13010-${String(i + 1).padStart(8, "0")}`,
    companyName: companies[i % companies.length],
    occupation: occupations[i % occupations.length],
    employmentType: types[i % types.length],
    workPlace: places[i % places.length],
    employeeCount: 10 + i * 10,
    wage: { min: 200000 + i * 10000, max: 400000 + i * 10000 },
    receivedDate: daysAgo(i),
  }),
);

// --- モック状態 ---

let _jobList: JobListResponse = {
  jobs: [],
  meta: { totalCount: 0, page: 1, totalPages: 0 },
};
let _jobMap = new Map<string, JobDetailResponse>();
let _companyMap = new Map<string, CompanyResponse>();

export function setMockJobs(jobs: JobDetailResponse[]) {
  _jobMap = new Map(jobs.map((j) => [j.jobNumber, j]));
  _jobList = {
    jobs,
    meta: { totalCount: jobs.length, page: 1, totalPages: 1 },
  };
}

export function setMockJobList(response: JobListResponse) {
  _jobList = response;
}

export function setMockCompanies(companies: CompanyResponse[]) {
  _companyMap = new Map(companies.map((c) => [c.establishmentNumber, c]));
}

// --- モッククライアント ---

function makeResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}

export const jobStoreClient = {
  jobs: {
    $get: async (opts?: {
      query?: { companyName?: string; establishmentNumber?: string };
    }) => {
      const { companyName, establishmentNumber } = opts?.query ?? {};
      if (establishmentNumber) {
        const filtered = _jobList.jobs.filter(
          (j) => j.establishmentNumber === establishmentNumber,
        );
        return makeResponse({
          jobs: filtered,
          meta: { totalCount: filtered.length, page: 1, totalPages: 1 },
        });
      }
      if (companyName) {
        const filtered = _jobList.jobs.filter(
          (j) => j.companyName === companyName,
        );
        return makeResponse({
          jobs: filtered,
          meta: { totalCount: filtered.length, page: 1, totalPages: 1 },
        });
      }
      return makeResponse(_jobList);
    },
    ":jobNumber": {
      $get: async ({ param }: { param: { jobNumber: string } }) => {
        const job = _jobMap.get(param.jobNumber);
        return makeResponse(job ?? null);
      },
    },
  },
  companies: {
    ":establishmentNumber": {
      $get: async ({ param }: { param: { establishmentNumber: string } }) => {
        const company = _companyMap.get(param.establishmentNumber);
        return company
          ? makeResponse(company)
          : makeResponse({ message: "Company not found" }, 404);
      },
    },
  },
};
