import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { nullable, number, object, string } from "valibot";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobNumber: text("jobNumber").notNull().unique(),
  companyName: text("companyName"),
  receivedDate: text("receivedDate").notNull(),
  expiryDate: text("expiryDate").notNull(),
  homePage: text("homePage"),
  occupation: text("occupation").notNull(),
  employmentType: text("employmentType").notNull(),
  wageMin: integer("wageMin").notNull(),
  wageMax: integer("wageMax").notNull(),
  workingStartTime: text("workingStartTime"),
  workingEndTime: text("workingEndTime"),
  employeeCount: integer("employeeCount").notNull(),
  workPlace: text("workPlace"),
  jobDescription: text("jobDescription"),
  qualifications: text("qualifications"),
  status: text("status").notNull().default("active"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

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
