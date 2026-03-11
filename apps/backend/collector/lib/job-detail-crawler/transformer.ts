import {
  EmployeeCount,
  EmploymentType,
  ExpiryDate,
  HomePageUrl,
  JobNumber,
  ReceivedDate,
  WageRange,
  WorkingHours,
} from "@sho/models";
import { Data, Effect, Either, Schema } from "effect";
import { parseHTML } from "linkedom";
import { formatParseError } from "../util";
import { extractRawFieldsFromDocument } from "./extractor";

// ── エラー ──

export class JobDetailTransformError extends Data.TaggedError(
  "JobDetailTransformError",
)<{
  readonly reason: string;
  readonly rawFields: string;
}> {}

// ── フィールド単位の transform ──

const japaneseDateToISOStr = Schema.transform(Schema.String, Schema.String, {
  strict: true,
  decode: (val) => {
    // "2025年7月23日" → "2025-07-23T..."
    const dateStr = val.replace("年", "-").replace("月", "-").replace("日", "");
    return new Date(dateStr).toISOString();
  },
  encode: (val) => {
    // "2025-07-23T..." → "2025年7月23日"
    const d = new Date(val);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },
});

const receivedDateTransform = japaneseDateToISOStr.pipe(
  Schema.compose(ReceivedDate),
);

const expiryDateTransform = japaneseDateToISOStr.pipe(
  Schema.compose(ExpiryDate),
);

const homePageTransform = Schema.transform(Schema.String, HomePageUrl, {
  strict: true,
  decode: (val) => {
    if (/^https?:\/\//i.test(val)) return val;
    return `https://${val}`;
  },
  encode: (val) => val,
});

const formatNumberWithCommas = (n: number): string => n.toLocaleString("ja-JP");

const wageRangeTransform = Schema.transform(Schema.String, WageRange, {
  strict: true,
  decode: (val) => {
    const match = val.match(/^(\d{1,3}(?:,\d{3})*)円〜(\d{1,3}(?:,\d{3})*)円$/);
    if (!match) throw new Error(`Invalid wage format: "${val}"`);
    return {
      min: Number.parseInt(match[1].replace(/,/g, ""), 10),
      max: Number.parseInt(match[2].replace(/,/g, ""), 10),
    };
  },
  encode: (val) =>
    `${formatNumberWithCommas(val.min)}円〜${formatNumberWithCommas(val.max)}円`,
});

const workingHoursTransform = Schema.transform(Schema.String, WorkingHours, {
  strict: true,
  decode: (val) => {
    const match = val.match(/^(\d{1,2})時(\d{1,2})分〜(\d{1,2})時(\d{1,2})分$/);
    if (!match)
      throw new Error(
        `Invalid working hours format, should be '9時00分〜18時00分': "${val}"`,
      );
    const [_, startH, startM, endH, endM] = match;
    return {
      start: `${startH.padStart(2, "0")}:${startM.padStart(2, "0")}:00`,
      end: `${endH.padStart(2, "0")}:${endM.padStart(2, "0")}:00`,
    };
  },
  encode: (val) => {
    const [sH, sM] = (val.start ?? "00:00:00").split(":");
    const [eH, eM] = (val.end ?? "00:00:00").split(":");
    return `${Number(sH)}時${sM}分〜${Number(eH)}時${eM}分`;
  },
});

const employeeCountTransform = Schema.transform(Schema.String, EmployeeCount, {
  strict: true,
  decode: (val) => {
    const match = val.match(/\d+/);
    if (!match) throw new Error(`Invalid employee count format: "${val}"`);
    return Number(match[0]);
  },
  encode: (val) => `${val}人`,
});

// ── 集約: RawJob → Domain Job ──

export const RawJobToDomainJob = Schema.Struct({
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
});

export type TransformedJob = typeof RawJobToDomainJob.Type;

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

            // Stage 1: DOM → RawJob
            const rawFields = extractRawFieldsFromDocument(document);

            // Stage 2: RawJob → Domain Job
            const result =
              Schema.decodeUnknownEither(RawJobToDomainJob)(rawFields);
            if (Either.isLeft(result)) {
              return yield* Effect.fail(
                new JobDetailTransformError({
                  reason: formatParseError(result.left),
                  rawFields: JSON.stringify(rawFields, null, 2),
                }),
              );
            }
            return result.right;
          }),
      };
    }),
  },
) {}
