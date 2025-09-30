import * as v from "valibot";

export const fromExtractJobNumberHandlerJobQueueEventBodySchema = v.object({
  job: v.object({
    jobNumber: v.string(),
  }),
});
