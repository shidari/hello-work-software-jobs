import type { InferOutput } from "valibot";
import type { JobSchema } from "../../schemas";

export type Job = InferOutput<typeof JobSchema>;
