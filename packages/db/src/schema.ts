import { Schema } from "effect";
import type { Selectable } from "kysely";
import type { CrawlerRuns, JobDetailRuns, Jobs } from "./generated/types";

// ── DB行スキーマ（フラット構造） ──

export const DbJobRowSchema = Schema.Struct({
  jobNumber: Schema.String,
  companyName: Schema.NullOr(Schema.String),
  receivedDate: Schema.String,
  expiryDate: Schema.String,
  homePage: Schema.NullOr(Schema.String),
  occupation: Schema.String,
  employmentType: Schema.String,
  wageMin: Schema.NullOr(Schema.Number),
  wageMax: Schema.NullOr(Schema.Number),
  workingStartTime: Schema.NullOr(Schema.String),
  workingEndTime: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(Schema.Number),
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// ── 型安全チェック: DbJobRowSchema.Type が Kysely 生成型と一致することを保証 ──

type _DbJobRow = typeof DbJobRowSchema.Type;
type _SelectableJobsWithoutId = Omit<Selectable<Jobs>, "id">;
const _check1: _DbJobRow extends _SelectableJobsWithoutId ? true : never = true;
const _check2: _SelectableJobsWithoutId extends _DbJobRow ? true : never = true;

// ── 型エクスポート ──

export type DbJobRow = typeof DbJobRowSchema.Type;

// ── CrawlerRun DB行スキーマ ──

export const DbCrawlerRunRowSchema = Schema.Struct({
  status: Schema.String,
  trigger: Schema.String,
  startedAt: Schema.String,
  finishedAt: Schema.NullOr(Schema.String),
  fetchedCount: Schema.Number,
  queuedCount: Schema.Number,
  failedCount: Schema.Number,
  errorMessage: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});

type _DbCrawlerRunRow = typeof DbCrawlerRunRowSchema.Type;
type _SelectableCrawlerRunsWithoutId = Omit<Selectable<CrawlerRuns>, "id">;
const _check3: _DbCrawlerRunRow extends _SelectableCrawlerRunsWithoutId
  ? true
  : never = true;
const _check4: _SelectableCrawlerRunsWithoutId extends _DbCrawlerRunRow
  ? true
  : never = true;

export type DbCrawlerRunRow = typeof DbCrawlerRunRowSchema.Type;

// ── JobDetailRun DB行スキーマ ──

export const DbJobDetailRunRowSchema = Schema.Struct({
  jobNumber: Schema.String,
  status: Schema.String,
  stage: Schema.NullOr(Schema.String),
  startedAt: Schema.String,
  finishedAt: Schema.NullOr(Schema.String),
  errorMessage: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});

type _DbJobDetailRunRow = typeof DbJobDetailRunRowSchema.Type;
type _SelectableJobDetailRunsWithoutId = Omit<Selectable<JobDetailRuns>, "id">;
const _check5: _DbJobDetailRunRow extends _SelectableJobDetailRunsWithoutId
  ? true
  : never = true;
const _check6: _SelectableJobDetailRunsWithoutId extends _DbJobDetailRunRow
  ? true
  : never = true;

export type DbJobDetailRunRow = typeof DbJobDetailRunRowSchema.Type;
