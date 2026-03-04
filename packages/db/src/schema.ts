import { Schema } from "effect";
import type { Selectable } from "kysely";
import type { Jobs } from "./generated/types";

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
type _Check1 = _DbJobRow extends _SelectableJobsWithoutId ? true : never;
type _Check2 = _SelectableJobsWithoutId extends _DbJobRow ? true : never;

// ── 型エクスポート ──

export type DbJobRow = typeof DbJobRowSchema.Type;
