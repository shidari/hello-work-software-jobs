// CQRS 層（commands / queries）をユースケースとして直接呼び出すテスト群。
// HTTP 層を介さず、Effect.Service の `run` を直接 invoke して
// 正常系と異常系の両方をカバーする。
import { env } from "cloudflare:test";
import type { Company, Job } from "@sho/models";
import type { RawJob } from "@sho/models/raw";
import { Effect } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { InsertJobCommand, UpsertCompanyCommand } from "../src/cqrs/commands";
import {
  FetchDailyStatsQuery,
  FetchJobsPageQuery,
  FindCompanyQuery,
  FindExistingJobNumbersQuery,
  FindJobByNumberQuery,
} from "../src/cqrs/queries";
import type { SearchFilter } from "../src/cqrs/schema";
import { JobStoreDB } from "../src/infra/db";
import { sampleCompanies, sampleJobs } from "./mock";

// --- ユースケース実行ヘルパ ---
// 各 CQRS Service を Effect.Service.Default で組み立て、JobStoreDB を注入して
// `run` を呼ぶ。HTTP 経路を挟まないので、コマンド/クエリ単体の振る舞いを
// そのまま観察できる。

const db = () => JobStoreDB.main(env.DB);

const runInsertJob = (payload: RawJob) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const cmd = yield* InsertJobCommand;
      return yield* cmd.run(payload);
    }).pipe(
      Effect.provide(InsertJobCommand.Default),
      Effect.provideService(JobStoreDB, db()),
    ),
  );

const runInsertJobExit = (payload: RawJob) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const cmd = yield* InsertJobCommand;
      return yield* cmd.run(payload);
    }).pipe(
      Effect.provide(InsertJobCommand.Default),
      Effect.provideService(JobStoreDB, db()),
      Effect.exit,
    ),
  );

const runUpsertCompany = (payload: Company) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const cmd = yield* UpsertCompanyCommand;
      return yield* cmd.run(payload);
    }).pipe(
      Effect.provide(UpsertCompanyCommand.Default),
      Effect.provideService(JobStoreDB, db()),
    ),
  );

const runFindJobByNumber = (jobNumber: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const q = yield* FindJobByNumberQuery;
      return yield* q.run(jobNumber);
    }).pipe(
      Effect.provide(FindJobByNumberQuery.Default),
      Effect.provideService(JobStoreDB, db()),
    ),
  );

const runFindExistingJobNumbers = (jobNumbers: readonly string[]) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const q = yield* FindExistingJobNumbersQuery;
      return yield* q.run(jobNumbers);
    }).pipe(
      Effect.provide(FindExistingJobNumbersQuery.Default),
      Effect.provideService(JobStoreDB, db()),
    ),
  );

const runFetchJobsPage = (options: { page: number; filter: SearchFilter }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const q = yield* FetchJobsPageQuery;
      return yield* q.run(options);
    }).pipe(
      Effect.provide(FetchJobsPageQuery.Default),
      Effect.provideService(JobStoreDB, db()),
    ),
  );

const runFindCompany = (establishmentNumber: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const q = yield* FindCompanyQuery;
      return yield* q.run(establishmentNumber);
    }).pipe(
      Effect.provide(FindCompanyQuery.Default),
      Effect.provideService(JobStoreDB, db()),
    ),
  );

const runFetchDailyStats = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const q = yield* FetchDailyStatsQuery;
      return yield* q.run();
    }).pipe(
      Effect.provide(FetchDailyStatsQuery.Default),
      Effect.provideService(JobStoreDB, db()),
    ),
  );

// --- InsertJobCommand ---

describe("[usecase] InsertJobCommand", () => {
  it("正常系: 新規 jobNumber を insert すると jobNumber を返す", async () => {
    const [job] = sampleJobs({ num: 1 });
    const result = await runInsertJob(job);
    expect(result.jobNumber).toBe(job.jobNumber);
  });

  it("異常系: 同じ jobNumber を 2 度 insert すると UNIQUE 制約違反で fail する", async () => {
    const [job] = sampleJobs({ num: 1 });
    await runInsertJob(job);

    const exit = await runInsertJobExit(job);
    // tryPromise の catch arm が InsertJobError を作る
    expect(exit._tag).toBe("Failure");
  });
});

// --- UpsertCompanyCommand ---

describe("[usecase] UpsertCompanyCommand", () => {
  it("正常系: 新規 establishmentNumber を insert できる", async () => {
    const [company] = sampleCompanies({ num: 1 });
    const result = await runUpsertCompany(company);
    expect(result.establishmentNumber).toBe(company.establishmentNumber);

    const found = await runFindCompany(company.establishmentNumber);
    expect(found?.establishmentNumber).toBe(company.establishmentNumber);
  });

  it("正常系: 同じ establishmentNumber を 2 度送ると update 経路で値が上書きされる", async () => {
    const [base] = sampleCompanies({ num: 1 });
    await runUpsertCompany({ ...base, companyName: "初回登録株式会社" });
    const second = await runUpsertCompany({
      ...base,
      companyName: "更新後株式会社",
    });
    expect(second.establishmentNumber).toBe(base.establishmentNumber);

    const found = await runFindCompany(base.establishmentNumber);
    expect(found?.companyName).toBe("更新後株式会社");
  });
});

// --- FindJobByNumberQuery ---

describe("[usecase] FindJobByNumberQuery", () => {
  it("正常系: 登録済みの jobNumber で job を返す", async () => {
    const [job] = sampleJobs({ num: 1 });
    await runInsertJob(job);
    const found = await runFindJobByNumber(job.jobNumber);
    expect(found?.jobNumber).toBe(job.jobNumber);
  });

  it("異常系: 未登録の jobNumber では null を返す", async () => {
    const found = await runFindJobByNumber("99999-99999999");
    expect(found).toBeNull();
  });
});

// --- FindExistingJobNumbersQuery ---

describe("[usecase] FindExistingJobNumbersQuery", () => {
  it("正常系: 空配列を渡すと DB 問い合わせなしで空配列を返す", async () => {
    const existing = await runFindExistingJobNumbers([]);
    expect(existing).toEqual([]);
  });

  it("正常系: 全件未登録なら空配列を返す", async () => {
    const existing = await runFindExistingJobNumbers([
      "99991-00000001",
      "99991-00000002",
    ]);
    expect(existing).toEqual([]);
  });

  it("正常系: 一部のみ登録されているとき、登録されている jobNumber だけ返す", async () => {
    const [registered, unregistered] = sampleJobs({ num: 2 });
    await runInsertJob(registered);

    const existing = await runFindExistingJobNumbers([
      registered.jobNumber,
      unregistered.jobNumber,
    ]);
    expect(existing).toContain(registered.jobNumber);
    expect(existing).not.toContain(unregistered.jobNumber);
  });

  it("正常系: CHUNK_SIZE(100) を跨ぐ件数でも全件正しく拾える", async () => {
    // 150 件登録 → 150 件問い合わせ
    const jobs = sampleJobs({ num: 150 });
    for (const job of jobs) {
      await runInsertJob(job);
    }
    const existing = await runFindExistingJobNumbers(
      jobs.map((j) => j.jobNumber),
    );
    expect(existing.length).toBe(150);
  });
});

// --- FetchJobsPageQuery: フィルター網羅 ---

describe("[usecase] FetchJobsPageQuery: フィルター", () => {
  // 既知のシード値を 1 件作って、各フィルターでそれだけが残ることを確認する。
  // sampleJobs で得た base に対し fixture フィールドだけ上書きする。
  let base: Job;
  beforeEach(() => {
    [base] = sampleJobs({ num: 1 });
  });

  it("正常系: companyName 部分一致でヒット", async () => {
    await runInsertJob({ ...base, companyName: "ユニーク絞込会社" });
    const { jobs, meta } = await runFetchJobsPage({
      page: 1,
      filter: { companyName: "ユニーク絞込" },
    });
    expect(meta.totalCount).toBe(1);
    expect(jobs[0].jobNumber).toBe(base.jobNumber);
  });

  it("正常系: employeeCountGt / employeeCountLt の範囲フィルタ", async () => {
    await runInsertJob({ ...base, employeeCount: 50 });

    const hit = await runFetchJobsPage({
      page: 1,
      filter: { employeeCountGt: 10, employeeCountLt: 100 },
    });
    expect(hit.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(true);

    const miss = await runFetchJobsPage({
      page: 1,
      filter: { employeeCountGt: 100 },
    });
    expect(miss.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(false);
  });

  it("正常系: jobDescription / jobDescriptionExclude が反転して効く", async () => {
    await runInsertJob({
      ...base,
      jobDescription: "TypeScript / React / Next.js でのフロント開発",
    });

    const included = await runFetchJobsPage({
      page: 1,
      filter: { jobDescription: "TypeScript" },
    });
    expect(included.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(
      true,
    );

    const excluded = await runFetchJobsPage({
      page: 1,
      filter: { jobDescriptionExclude: "TypeScript" },
    });
    expect(excluded.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(
      false,
    );
  });

  it("正常系: onlyNotExpired = true で expired job を除外", async () => {
    // 期限切れ
    await runInsertJob({
      ...base,
      expiryDate: "2000-01-01T00:00:00+09:00" as Job["expiryDate"],
    });
    const { jobs } = await runFetchJobsPage({
      page: 1,
      filter: { onlyNotExpired: true },
    });
    expect(jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(false);
  });

  it("正常系: addedSince / addedUntil で createdAt 範囲を絞れる", async () => {
    await runInsertJob(base);
    // queries.ts は `${date}T00:00:00+09:00` で JST 解釈するので today も JST 起点
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
    }).format(new Date());
    const hit = await runFetchJobsPage({
      page: 1,
      filter: { addedSince: today, addedUntil: today },
    });
    expect(hit.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(true);

    // 未来日の since では除外
    const future = "2099-01-01";
    const miss = await runFetchJobsPage({
      page: 1,
      filter: { addedSince: future },
    });
    expect(miss.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(false);
  });

  it("正常系: occupation / workPlace / qualifications / education / industryClassification の LIKE 系", async () => {
    await runInsertJob({
      ...base,
      occupation: "Webエンジニアa1b2",
      workPlace: "東京都港区a1b2",
      qualifications: "TypeScripta1b2",
      education: "大学卒a1b2",
      industryClassification: "情報通信業a1b2",
    });

    for (const filter of [
      { occupation: "a1b2" },
      { workPlace: "a1b2" },
      { qualifications: "a1b2" },
      { education: "a1b2" },
      { industryClassification: "a1b2" },
    ] satisfies SearchFilter[]) {
      const { jobs } = await runFetchJobsPage({ page: 1, filter });
      expect(jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(true);
    }
  });

  it("正常系: employmentType / jobCategory / wageType の完全一致", async () => {
    await runInsertJob({
      ...base,
      employmentType: "正社員" as Job["employmentType"],
      jobCategory: "フルタイム" as Job["jobCategory"],
      wageType: "月給" as Job["wageType"],
    });
    const { jobs } = await runFetchJobsPage({
      page: 1,
      filter: {
        employmentType: "正社員" as SearchFilter["employmentType"],
        jobCategory: "フルタイム" as SearchFilter["jobCategory"],
        wageType: "月給" as SearchFilter["wageType"],
      },
    });
    expect(jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(true);
  });

  it("正常系: wageMin / wageMax で賃金範囲を絞れる", async () => {
    await runInsertJob({ ...base, wage: { min: 250000, max: 350000 } });

    const hit = await runFetchJobsPage({
      page: 1,
      filter: { wageMin: 200000, wageMax: 400000 },
    });
    expect(hit.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(true);

    const miss = await runFetchJobsPage({
      page: 1,
      filter: { wageMin: 400000 },
    });
    expect(miss.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(false);
  });

  it("正常系: orderByReceiveDate=desc で receivedDate 降順に並ぶ", async () => {
    // 5 件挿入してソート確認
    for (const job of sampleJobs({ num: 5 })) {
      await runInsertJob(job);
    }
    const { jobs } = await runFetchJobsPage({
      page: 1,
      filter: { orderByReceiveDate: "desc" },
    });
    if (jobs.length >= 2) {
      const dates = jobs.map((j) => j.receivedDate);
      const sortedDesc = [...dates].sort((a, b) => (a < b ? 1 : -1));
      expect(dates).toEqual(sortedDesc);
    }
  });

  it("正常系: フィルタなしで全件取得し meta.totalCount / page を返す", async () => {
    for (const job of sampleJobs({ num: 3 })) {
      await runInsertJob(job);
    }
    const { meta } = await runFetchJobsPage({ page: 1, filter: {} });
    expect(meta.page).toBe(1);
    expect(meta.totalCount).toBeGreaterThanOrEqual(3);
  });
});

// --- FindCompanyQuery ---

describe("[usecase] FindCompanyQuery", () => {
  it("正常系: 登録済み事業所を取得できる", async () => {
    const [company] = sampleCompanies({ num: 1 });
    await runUpsertCompany(company);
    const found = await runFindCompany(company.establishmentNumber);
    expect(found?.establishmentNumber).toBe(company.establishmentNumber);
  });

  it("異常系: 未登録の事業所では null を返す", async () => {
    const found = await runFindCompany("9999-999999-9");
    expect(found).toBeNull();
  });
});

// --- FetchDailyStatsQuery ---

describe("[usecase] FetchDailyStatsQuery", () => {
  it("正常系: jobs が空なら空配列を返す", async () => {
    const stats = await runFetchDailyStats();
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBe(0);
  });

  it("正常系: 同日に N 件 insert すると addedDate ごとに count / jobNumbers が集計される", async () => {
    const jobs = sampleJobs({ num: 3 });
    for (const job of jobs) {
      await runInsertJob(job);
    }
    const stats = await runFetchDailyStats();
    expect(stats.length).toBeGreaterThanOrEqual(1);
    const total = stats.reduce((sum, day) => sum + day.count, 0);
    expect(total).toBeGreaterThanOrEqual(3);
    // jobNumbers が JSON 配列として正しく parse されている
    for (const day of stats) {
      expect(Array.isArray(day.jobNumbers)).toBe(true);
      expect(day.jobNumbers.length).toBe(day.count);
    }
  });
});
