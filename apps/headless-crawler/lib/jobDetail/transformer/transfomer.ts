import { Effect } from "effect";
import { JobDetailTransformer } from "./context";
export const buildProgram = (rawHtml: string) =>
  Effect.gen(function* () {
    const transformer = yield* JobDetailTransformer;
    yield* Effect.logInfo("start transforming job detail.");
    const transformed = yield* transformer.transform(rawHtml);
    return transformed;
  });
