import { Effect } from "effect";
import { JobDetailLoader } from "./context";
import type { InferOutput } from "valibot";
import type { transformedSchema } from "@sho/models";
export const buildProgram = (data: InferOutput<typeof transformedSchema>) =>
  Effect.gen(function* () {
    const loader = yield* JobDetailLoader;
    yield* Effect.logInfo(
      `start loading job detail. data=${JSON.stringify(data, null, 2)}`,
    );
    yield* loader.load(data);
    return void 0;
  });
