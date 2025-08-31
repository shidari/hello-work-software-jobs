import type { InferOutput } from "valibot";
import type { decodedNextTokenSchema } from "../../schemas";
import type { JobListSchema } from "../../schemas/job-store/client";

export type JobList = InferOutput<typeof JobListSchema>;

export type DecodedNextToken = InferOutput<typeof decodedNextTokenSchema>;
