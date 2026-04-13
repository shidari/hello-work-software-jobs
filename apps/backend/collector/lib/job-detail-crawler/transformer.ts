import {
  type Company,
  CorporateNumber,
  EmployeeCount,
  EmploymentType,
  EstablishmentNumber,
  ExpiryDate,
  HomePageUrl,
  JobCategory,
  JobNumber,
  ReceivedDate,
  WageRange,
  WageType,
  WorkingHours,
} from "@sho/models";
import { Data, Effect, Either, ParseResult, Schema } from "effect";
import { parseHTML } from "linkedom";
import { formatParseError } from "../util";
import {
  extractRawCompanyFromDocument,
  extractRawFieldsFromDocument,
} from "./extractor";

// ── エラー ──

export class JobDetailTransformError extends Data.TaggedError(
  "JobDetailTransformError",
)<{
  readonly reason: string;
  readonly error?: unknown;
  readonly rawFields: string;
}> {}

export class CompanyTransformError extends Data.TaggedError(
  "CompanyTransformError",
)<{
  readonly reason: string;
  readonly error?: unknown;
  readonly rawFields: string;
}> {}

// ── フィールド単位の transform ──

const japaneseDateToISOStr = Schema.transformOrFail(
  Schema.String,
  Schema.String,
  {
    strict: true,
    decode: (val) => {
      // "2025年7月23日" → "2025-07-23"
      const dateStr = val
        .replace("年", "-")
        .replace("月", "-")
        .replace("日", "");
      return ParseResult.succeed(new Date(dateStr).toISOString());
    },
    encode: (val, _, ast) =>
      ParseResult.fail(new ParseResult.Type(ast, val, "encode not supported")),
  },
);

const receivedDateTransform = japaneseDateToISOStr.pipe(
  Schema.compose(ReceivedDate),
);

const expiryDateTransform = japaneseDateToISOStr.pipe(
  Schema.compose(ExpiryDate),
);

const homePageTransform = Schema.transformOrFail(Schema.String, HomePageUrl, {
  strict: true,
  decode: (val) =>
    ParseResult.succeed(/^https?:\/\//i.test(val) ? val : `https://${val}`),
  encode: (val, _, ast) =>
    ParseResult.fail(new ParseResult.Type(ast, val, "encode not supported")),
});

const wageRangeTransform = Schema.transformOrFail(Schema.String, WageRange, {
  strict: true,
  decode: (val, _, ast) => {
    const match = val.match(/^(\d{1,3}(?:,\d{3})*)円〜(\d{1,3}(?:,\d{3})*)円$/);
    if (!match)
      return ParseResult.fail(
        new ParseResult.Type(ast, val, `Invalid wage format: "${val}"`),
      );
    return ParseResult.succeed({
      min: Number.parseInt(match[1].replace(/,/g, ""), 10),
      max: Number.parseInt(match[2].replace(/,/g, ""), 10),
    });
  },
  encode: (val, _, ast) =>
    ParseResult.fail(new ParseResult.Type(ast, val, "encode not supported")),
});

const workingHoursTransform = Schema.transformOrFail(
  Schema.String,
  WorkingHours,
  {
    strict: true,
    decode: (val, _, ast) => {
      const match = val.match(
        /^(\d{1,2})時(\d{1,2})分〜(\d{1,2})時(\d{1,2})分$/,
      );
      if (!match)
        return ParseResult.fail(
          new ParseResult.Type(
            ast,
            val,
            `Invalid working hours format, should be '9時00分〜18時00分': "${val}"`,
          ),
        );
      const [, startH, startM, endH, endM] = match;
      return ParseResult.succeed({
        start: `${startH.padStart(2, "0")}:${startM.padStart(2, "0")}:00`,
        end: `${endH.padStart(2, "0")}:${endM.padStart(2, "0")}:00`,
      });
    },
    encode: (val, _, ast) =>
      ParseResult.fail(new ParseResult.Type(ast, val, "encode not supported")),
  },
);

const employeeCountTransform = Schema.transformOrFail(
  Schema.String,
  EmployeeCount,
  {
    strict: true,
    decode: (val, _, ast) => {
      const match = val.match(/\d+/);
      if (!match)
        return ParseResult.fail(
          new ParseResult.Type(
            ast,
            val,
            `Invalid employee count format: "${val}"`,
          ),
        );
      return ParseResult.succeed(Number(match[0]));
    },
    encode: (val, _, ast) =>
      ParseResult.fail(new ParseResult.Type(ast, val, "encode not supported")),
  },
);

const onlineApplicationTransform = Schema.transformOrFail(
  Schema.String,
  Schema.Boolean,
  {
    strict: true,
    decode: (val) => ParseResult.succeed(val === "可"),
    encode: (val, _, ast) =>
      ParseResult.fail(new ParseResult.Type(ast, val, "encode not supported")),
  },
);

// ── 集約: RawJob → Domain Job ──

export const RawJobToDomainJob = Schema.Struct({
  // 既存
  jobNumber: JobNumber,
  companyName: Schema.NullOr(Schema.String),
  receivedDate: receivedDateTransform,
  expiryDate: expiryDateTransform,
  homePage: Schema.NullOr(homePageTransform),
  occupation: Schema.String,
  employmentType: EmploymentType,
  wage: Schema.NullOr(wageRangeTransform),
  workingHours: Schema.NullOr(workingHoursTransform),
  employeeCount: Schema.NullOr(employeeCountTransform),
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
  // 新規: 求人情報
  establishmentNumber: Schema.NullOr(EstablishmentNumber),
  jobCategory: Schema.NullOr(JobCategory),
  industryClassification: Schema.NullOr(Schema.String),
  publicEmploymentOffice: Schema.NullOr(Schema.String),
  onlineApplicationAccepted: Schema.NullOr(onlineApplicationTransform),
  // 新規: 仕事内容
  dispatchType: Schema.NullOr(Schema.String),
  employmentPeriod: Schema.NullOr(Schema.String),
  ageRequirement: Schema.NullOr(Schema.String),
  education: Schema.NullOr(Schema.String),
  requiredExperience: Schema.NullOr(Schema.String),
  trialPeriod: Schema.NullOr(Schema.String),
  carCommute: Schema.NullOr(Schema.String),
  transferPossibility: Schema.NullOr(Schema.String),
  // 新規: 賃金
  wageType: Schema.NullOr(WageType),
  raise: Schema.NullOr(Schema.String),
  bonus: Schema.NullOr(Schema.String),
  // 新規: その他条件
  insurance: Schema.NullOr(Schema.String),
  retirementBenefit: Schema.NullOr(Schema.String),
});

export type TransformedJob = typeof RawJobToDomainJob.Type;

// ── 集約: RawCompany → Domain Company ──

export const RawCompanyToDomainCompany = Schema.Struct({
  establishmentNumber: EstablishmentNumber,
  companyName: Schema.NullOr(Schema.String),
  postalCode: Schema.NullOr(Schema.String),
  address: Schema.NullOr(Schema.String),
  employeeCount: Schema.NullOr(employeeCountTransform),
  foundedYear: Schema.NullOr(Schema.String),
  capital: Schema.NullOr(Schema.String),
  businessDescription: Schema.NullOr(Schema.String),
  corporateNumber: Schema.NullOr(CorporateNumber),
});

export type TransformedCompany = typeof RawCompanyToDomainCompany.Type;

// ── Transformer サービス ──

export class JobDetailTransformer extends Effect.Service<JobDetailTransformer>()(
  "JobDetailTransformer",
  {
    effect: Effect.gen(function* () {
      return {
        transform: (rawHtml: string) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("start transforming job detail...");
            const { document } = parseHTML(rawHtml);

            // Stage 1: DOM → RawJob + RawCompany
            const rawFields = extractRawFieldsFromDocument(document);
            const rawCompanyFields = extractRawCompanyFromDocument(document);

            // Stage 2: RawJob → Domain Job
            const jobResult =
              Schema.decodeUnknownEither(RawJobToDomainJob)(rawFields);
            if (Either.isLeft(jobResult)) {
              return yield* Effect.fail(
                new JobDetailTransformError({
                  reason: formatParseError(jobResult.left),
                  rawFields: JSON.stringify(rawFields, null, 2),
                }),
              );
            }

            // Stage 3: RawCompany → Domain Company (事業所番号がなければスキップ)
            let company: Company | null = null;
            if (rawCompanyFields.establishmentNumber) {
              const companyResult = Schema.decodeUnknownEither(
                RawCompanyToDomainCompany,
              )(rawCompanyFields);
              if (Either.isLeft(companyResult)) {
                yield* Effect.logWarning(
                  `company transform failed: ${formatParseError(companyResult.left)}`,
                );
              } else {
                company = companyResult.right;
              }
            }

            return { job: jobResult.right, company };
          }),
      };
    }),
  },
) {}
