import type { InferOutput } from "valibot";
import type { decodedNextTokenSchema, jobListQuerySchema } from "../../schemas";
import type { JobListSchema } from "../../schemas/job-store/client";

export type JobList = InferOutput<typeof JobListSchema>;

export type JobListQuery = InferOutput<typeof jobListQuerySchema>;

export type DecodedNextToken = InferOutput<typeof decodedNextTokenSchema>;
