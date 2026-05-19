// CQRS 層（commands / queries）をユースケースとして直接呼び出すテスト群。
// HTTP 層を介さず、Effect.Service の `run` を直接 invoke して
// 正常系と異常系の両方をカバーする。
import { env } from "cloudflare:test";
import type { Company, Job } from "@sho/models";
import type { RawJob } from "@sho/models/raw";
import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

// --- 求人登録 ---

describe("求人登録", () => {
  it("新規求人を登録すると求人番号が返る", async () => {
    const [job] = sampleJobs({ num: 1 });
    const result = await runInsertJob(job);
    expect(result.jobNumber).toBe(job.jobNumber);
  });

  it("同じ求人番号を 2 度登録すると失敗する", async () => {
    const [job] = sampleJobs({ num: 1 });
    await runInsertJob(job);

    const exit = await runInsertJobExit(job);
    // tryPromise の catch arm が InsertJobError を作る
    expect(exit._tag).toBe("Failure");
  });
});

// --- 事業所登録 ---

describe("事業所登録", () => {
  it("新規事業所を登録できる", async () => {
    const [company] = sampleCompanies({ num: 1 });
    const result = await runUpsertCompany(company);
    expect(result.establishmentNumber).toBe(company.establishmentNumber);

    const found = await runFindCompany(company.establishmentNumber);
    expect(found?.establishmentNumber).toBe(company.establishmentNumber);
  });

  it("同じ事業所を再登録すると値が上書きされる", async () => {
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

// --- 求人取得 ---

describe("求人取得", () => {
  it("登録済みの求人番号で求人を取得できる", async () => {
    const [job] = sampleJobs({ num: 1 });
    await runInsertJob(job);
    const found = await runFindJobByNumber(job.jobNumber);
    expect(found?.jobNumber).toBe(job.jobNumber);
  });

  it("未登録の求人番号では見つからない", async () => {
    const found = await runFindJobByNumber("99999-99999999");
    expect(found).toBeNull();
  });
});

// --- 登録済み求人番号の絞り込み ---

describe("登録済み求人番号の絞り込み", () => {
  it("問い合わせが空なら結果も空になる", async () => {
    const existing = await runFindExistingJobNumbers([]);
    expect(existing).toEqual([]);
  });

  it("すべて未登録なら結果が空になる", async () => {
    const existing = await runFindExistingJobNumbers([
      "99991-00000001",
      "99991-00000002",
    ]);
    expect(existing).toEqual([]);
  });

  it("登録済みの求人番号だけが返る", async () => {
    const [registered, unregistered] = sampleJobs({ num: 2 });
    await runInsertJob(registered);

    const existing = await runFindExistingJobNumbers([
      registered.jobNumber,
      unregistered.jobNumber,
    ]);
    expect(existing).toContain(registered.jobNumber);
    expect(existing).not.toContain(unregistered.jobNumber);
  });

  it("100 件を超える問い合わせでも全件返る", async () => {
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

// --- 求人検索 ---

describe("求人検索", () => {
  // 既知のシード値を 1 件作って、各フィルターでそれだけが残ることを確認する。
  // sampleJobs で得た base に対し fixture フィールドだけ上書きする。
  let base: Job;
  beforeEach(() => {
    [base] = sampleJobs({ num: 1 });
  });

  it("会社名で部分一致検索できる", async () => {
    await runInsertJob({ ...base, companyName: "ユニーク絞込会社" });
    const { jobs, meta } = await runFetchJobsPage({
      page: 1,
      filter: { companyName: "ユニーク絞込" },
    });
    expect(meta.totalCount).toBe(1);
    expect(jobs[0].jobNumber).toBe(base.jobNumber);
  });

  it("従業員数の範囲で絞り込める", async () => {
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

  it("仕事内容のキーワード含む/除外で絞り込める", async () => {
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

  it("期限切れの求人を除外できる", async () => {
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

  it("登録日の範囲で絞り込める", async () => {
    // 時刻を固定して INSERT 時の createdAt とフィルタ境界を確定させる。
    // queries.ts が `${date}T00:00:00+09:00` で JST 解釈するので、JST 12:00 に固定すれば
    // フィルタの "2026-06-15" 範囲に確実に収まる。
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00+09:00"));
    try {
      await runInsertJob(base);
      const hit = await runFetchJobsPage({
        page: 1,
        filter: { addedSince: "2026-06-15", addedUntil: "2026-06-15" },
      });
      expect(hit.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(true);

      // 未来日の since では除外
      const miss = await runFetchJobsPage({
        page: 1,
        filter: { addedSince: "2099-01-01" },
      });
      expect(miss.jobs.some((j) => j.jobNumber === base.jobNumber)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("職種・勤務地・資格・学歴・業種で絞り込める", async () => {
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

  it("雇用形態・職種区分・賃金形態で絞り込める", async () => {
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

  it("賃金の範囲で絞り込める", async () => {
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

  it("受理日の降順で並べ替えられる", async () => {
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

  it("条件指定なしで全件取得し総件数とページ番号が返る", async () => {
    for (const job of sampleJobs({ num: 3 })) {
      await runInsertJob(job);
    }
    const { meta } = await runFetchJobsPage({ page: 1, filter: {} });
    expect(meta.page).toBe(1);
    expect(meta.totalCount).toBeGreaterThanOrEqual(3);
  });
});

// --- 事業所取得 ---

describe("事業所取得", () => {
  it("登録済み事業所を取得できる", async () => {
    const [company] = sampleCompanies({ num: 1 });
    await runUpsertCompany(company);
    const found = await runFindCompany(company.establishmentNumber);
    expect(found?.establishmentNumber).toBe(company.establishmentNumber);
  });

  it("未登録の事業所では見つからない", async () => {
    const found = await runFindCompany("9999-999999-9");
    expect(found).toBeNull();
  });
});

// --- 日次集計 ---

describe("日次集計", () => {
  it("求人がなければ集計結果は空になる", async () => {
    const stats = await runFetchDailyStats();
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBe(0);
  });

  it("登録日ごとに件数と求人番号一覧が集計される", async () => {
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
