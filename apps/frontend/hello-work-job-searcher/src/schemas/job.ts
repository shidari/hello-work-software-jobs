import { Schema } from "effect";
import { ISODateSchema } from "./common";

export const JobOverviewSchema = Schema.Struct({
  jobNumber: Schema.String,
  companyName: Schema.optional(Schema.String),
  workPlace: Schema.String,
  jobTitle: Schema.String,
  employmentType: Schema.String, // 後でもっと型を細かくする
  employeeCount: Schema.Number,
  receivedDate: ISODateSchema,
});

export const JobDetailSchema = Schema.Struct({
  ...JobOverviewSchema.fields,
  salary: Schema.String,
  jobDescription: Schema.String,
  expiryDate: Schema.String,
  workingHours: Schema.String,
  qualifications: Schema.optional(Schema.String),
});

export type TJobOverview = typeof JobOverviewSchema.Type;
export type TJobDetail = typeof JobDetailSchema.Type;
