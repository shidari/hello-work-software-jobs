import * as v from "valibot";
import { ISODateSchema } from "../common";
export * from "./type";

export const JobOverviewSchema = v.object({
  jobNumber: v.string(),
  companyName: v.optional(v.string()),
  workPlace: v.string(),
  jobTitle: v.string(),
  employmentType: v.string(), // 後でもっと型を細かくする
  employeeCount: v.number(),
  receivedDate: ISODateSchema,
});

export const JobDetailSchema = v.object({
  ...JobOverviewSchema.entries,
  salary: v.string(),
  jobDescription: v.string(),
  expiryDate: v.string(),
  workingHours: v.string(),
  qualifications: v.optional(v.string()),
});
