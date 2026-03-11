import { PubSub } from "@google-cloud/pubsub";
import { JobNumber } from "@sho/models";
import { Config, Data, Effect, Schema } from "effect";

export class PubSubPublishError extends Data.TaggedError("PubSubPublishError")<{
  readonly message: string;
}> {}

export class PubSubConfig extends Effect.Service<PubSubConfig>()(
  "PubSubConfig",
  {
    effect: Effect.gen(function* () {
      const projectId = yield* Config.string("GCP_PROJECT_ID").pipe(
        Config.withDefault("local-dev"),
      );
      const topicName = yield* Config.string("PUBSUB_TOPIC").pipe(
        Config.withDefault("job-detail-queue"),
      );
      return { projectId, topicName };
    }),
  },
) {}

const JobDetailMessage = Schema.Struct({
  jobNumber: JobNumber,
});

export const publishJobDetail = (payload: { jobNumber: string }) =>
  Effect.gen(function* () {
    const { jobNumber } =
      yield* Schema.decodeUnknown(JobDetailMessage)(payload);

    const { projectId, topicName } = yield* PubSubConfig;
    const pubsub = new PubSub({ projectId });
    const topic = pubsub.topic(topicName);

    yield* Effect.tryPromise({
      try: () =>
        topic.publishMessage({
          data: Buffer.from(JSON.stringify({ jobNumber })),
        }),
      catch: (e) =>
        new PubSubPublishError({
          message: `Failed to publish to Pub/Sub: ${String(e)}`,
        }),
    });
  });
