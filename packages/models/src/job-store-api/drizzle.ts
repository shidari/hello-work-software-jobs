import { nullable, number, object, string } from "valibot";

// これ、キーしか型チェック指定なので、かなりfreaky
export const jobSelectSchema = object({
  id: number(),
  jobNumber: string(),
  companyName: nullable(string()),
  receivedDate: string(),
  expiryDate: string(),
  homePage: nullable(string()),
  occupation: string(),
  employmentType: string(),
  wageMin: number(),
  wageMax: number(),
  workingStartTime: nullable(string()),
  workingEndTime: nullable(string()),
  employeeCount: number(),
  workPlace: nullable(string()),
  jobDescription: nullable(string()),
  qualifications: nullable(string()),
  status: string(),
  createdAt: string(),
  updatedAt: string(),
});
