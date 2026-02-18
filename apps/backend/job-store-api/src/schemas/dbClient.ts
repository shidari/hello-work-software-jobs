import {
	array,
	boolean,
	integer,
	isoDate,
	literal,
	number,
	object,
	optional,
	pipe,
	string,
	union,
} from "valibot";
import { jobSelectSchema } from "./drizzle";

export const searchFilterSchema = object({
	companyName: optional(string()),
	employeeCountLt: optional(pipe(number(), integer())),
	employeeCountGt: optional(pipe(number(), integer())),
	jobDescription: optional(string()),
	jobDescriptionExclude: optional(string()), // 除外キーワード
	onlyNotExpired: optional(boolean()),
	orderByReceiveDate: optional(union([literal("asc"), literal("desc")])),
	addedSince: optional(pipe(string(), isoDate())),
	addedUntil: optional(pipe(string(), isoDate())),
});

const { id, createdAt, updatedAt, status, ...jobSelectSchemaWithoutSome } =
	jobSelectSchema.entries;
export const JobListSchema = array(object({ ...jobSelectSchemaWithoutSome }));

// Valibotでomitはスプレッドで除外
const { id: _, ...jobSelectSchemaWithoutId } = jobSelectSchema.entries;
export const JobSchema = object({ ...jobSelectSchemaWithoutId });
