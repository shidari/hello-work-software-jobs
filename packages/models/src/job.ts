import * as v from "valibot";

export const jobNumberSchema = v.pipe(
  v.string(),
  v.regex(/^\d{5}-\d{0,8}$/),
  v.brand("jobNumber"),
);

export type JobNumber = v.InferOutput<typeof jobNumberSchema>;

export const job = v.object({
  id: v.number(),
  jobNumber: v.string(),
  companyName: v.string(),
  receivedDate: v.string(),
  expiryDate: v.string(),
  homePage: v.nullable(v.string()),
  occupation: v.string(),
  employmentType: v.string(),
  wageMin: v.number(),
  wageMax: v.number(),
  workingStartTime: v.nullable(v.string()),
  workingEndTime: v.nullable(v.string()),
  employeeCount: v.number(),
  workPlace: v.nullable(v.string()),
  jobDescription: v.nullable(v.string()),
  qualifications: v.nullable(v.string()),
  status: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export type Job = v.InferOutput<typeof job>;
