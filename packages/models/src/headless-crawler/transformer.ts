import * as v from "valibot";
import { ScrapedJobSchema } from "./scraper";

export const ISO8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export const transformedSchema = v.object({
  ...v.omit(ScrapedJobSchema, ["wage", "workingHours"]).entries,
  wageMin: v.number(),
  wageMax: v.number(),
  workingStartTime: v.string(),
  workingEndTime: v.string(),
  receivedDate: v.pipe(v.string(), v.regex(ISO8601)),
  expiryDate: v.pipe(v.string(), v.regex(ISO8601)),
  employeeCount: v.number(),
});
