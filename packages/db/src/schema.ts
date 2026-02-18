import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobNumber: text("jobNumber").notNull().unique(),
  companyName: text("companyName").notNull(),
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

export const raw_jobs = sqliteTable("raw_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobNumber: text("jobNumber").notNull().unique(),
  rawHTML: text("rawHTML").notNull(),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});
