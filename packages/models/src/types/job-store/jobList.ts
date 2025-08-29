import type { InferOutput } from "valibot";
import type { decodedNextTokenSchema, JobListSchema } from "../../schemas";

export type JobList = InferOutput<typeof JobListSchema>;

export type DecodedNextToken = InferOutput<typeof decodedNextTokenSchema>;
