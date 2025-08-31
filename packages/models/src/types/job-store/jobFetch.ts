import type { InferOutput } from "valibot";
import type { JobSchema } from "../../schemas/job-store/client";

export type Job = InferOutput<typeof JobSchema>;
