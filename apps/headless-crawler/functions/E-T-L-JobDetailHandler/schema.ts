import * as v from "valibot";

export const fromExtractJobNumberHandlerJobQueueEventBodySchema = v.object({
  jobNumber: v.string(),
});
