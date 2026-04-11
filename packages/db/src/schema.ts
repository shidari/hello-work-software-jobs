import { Schema } from "effect";
import type { Selectable } from "kysely";
import type { Companies, JobAttachments, Jobs } from "./generated/types";

// ── DB行スキーマ: Company（フラット構造） ──

export const DbCompanyRowSchema = Schema.Struct({
  establishmentNumber: Schema.String,
  companyName: Schema.NullOr(Schema.String),
  postalCode: Schema.NullOr(Schema.String),
  address: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(Schema.Number),
  foundedYear: Schema.NullOr(Schema.String),
  capital: Schema.NullOr(Schema.String),
  businessDescription: Schema.NullOr(Schema.String),
  corporateNumber: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

type _DbCompanyRow = typeof DbCompanyRowSchema.Type;
type _SelectableCompaniesWithoutId = Omit<Selectable<Companies>, "id">;
const _checkC1: _DbCompanyRow extends _SelectableCompaniesWithoutId
  ? true
  : never = true;
const _checkC2: _SelectableCompaniesWithoutId extends _DbCompanyRow
  ? true
  : never = true;

export type DbCompanyRow = typeof DbCompanyRowSchema.Type;

// ── DB行スキーマ: Job（フラット構造） ──

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
  establishmentNumber: Schema.NullOr(Schema.String),
  jobCategory: Schema.NullOr(Schema.String),
  industryClassification: Schema.NullOr(Schema.String),
  publicEmploymentOffice: Schema.NullOr(Schema.String),
  onlineApplicationAccepted: Schema.NullOr(Schema.Number),
  dispatchType: Schema.NullOr(Schema.String),
  employmentPeriod: Schema.NullOr(Schema.String),
  ageRequirement: Schema.NullOr(Schema.String),
  education: Schema.NullOr(Schema.String),
  requiredExperience: Schema.NullOr(Schema.String),
  trialPeriod: Schema.NullOr(Schema.String),
  carCommute: Schema.NullOr(Schema.String),
  transferPossibility: Schema.NullOr(Schema.String),
  wageType: Schema.NullOr(Schema.String),
  raise: Schema.NullOr(Schema.String),
  bonus: Schema.NullOr(Schema.String),
  insurance: Schema.NullOr(Schema.String),
  retirementBenefit: Schema.NullOr(Schema.String),
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

type _DbJobRow = typeof DbJobRowSchema.Type;
type _SelectableJobsWithoutId = Omit<Selectable<Jobs>, "id">;
const _check1: _DbJobRow extends _SelectableJobsWithoutId ? true : never = true;
const _check2: _SelectableJobsWithoutId extends _DbJobRow ? true : never = true;

export type DbJobRow = typeof DbJobRowSchema.Type;

// ── DB行スキーマ: JobAttachment ──

export const DbJobAttachmentRowSchema = Schema.Struct({
  jobNumber: Schema.String,
  r2Key: Schema.String,
  sizeBytes: Schema.Number,
  createdAt: Schema.String,
});

type _DbJobAttachmentRow = typeof DbJobAttachmentRowSchema.Type;
type _SelectableJobAttachmentsWithoutId = Omit<
  Selectable<JobAttachments>,
  "id"
>;
const _check3: _DbJobAttachmentRow extends _SelectableJobAttachmentsWithoutId
  ? true
  : never = true;
const _check4: _SelectableJobAttachmentsWithoutId extends _DbJobAttachmentRow
  ? true
  : never = true;

export type DbJobAttachmentRow = typeof DbJobAttachmentRowSchema.Type;
