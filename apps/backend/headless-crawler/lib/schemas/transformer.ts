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
import { Schema } from "effect";

// ── フィールド単位の transform ──

const japaneseDateToISOStr = Schema.transform(Schema.String, Schema.String, {
  strict: true,
  decode: (val) => {
    // "2025年7月23日" → "2025-07-23"
    const dateStr = val.replace("年", "-").replace("月", "-").replace("日", "");
    return new Date(dateStr).toISOString();
  },
  encode: () => {
    throw new Error("encode not supported");
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
  encode: () => {
    throw new Error("encode not supported");
  },
});

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
  encode: () => {
    throw new Error("encode not supported");
  },
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
  encode: () => {
    throw new Error("encode not supported");
  },
});

const employeeCountTransform = Schema.transform(Schema.String, EmployeeCount, {
  strict: true,
  decode: (val) => {
    const match = val.match(/\d+/);
    if (!match) throw new Error(`Invalid employee count format: "${val}"`);
    return Number(match[0]);
  },
  encode: () => {
    throw new Error("encode not supported");
  },
});

// ── 集約: Raw → Domain ──

export const RawJobToDomainJob = Schema.Struct({
  jobNumber: JobNumber,
  companyName: Schema.String,
  receivedDate: receivedDateTransform,
  expiryDate: expiryDateTransform,
  homePage: Schema.NullOr(homePageTransform),
  occupation: Schema.String,
  employmentType: EmploymentType,
  wage: wageRangeTransform,
  workingHours: workingHoursTransform,
  employeeCount: employeeCountTransform,
  workPlace: Schema.NullOr(Schema.String),
  jobDescription: Schema.NullOr(Schema.String),
  qualifications: Schema.NullOr(Schema.String),
});

export type TransformedJob = typeof RawJobToDomainJob.Type;
