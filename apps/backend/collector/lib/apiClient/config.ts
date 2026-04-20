import { Config, Context, Effect, Layer } from "effect";

export class APIConfig extends Context.Tag("APIConfig")<
  APIConfig,
  { readonly endpoint: string; readonly apiKey: string }
>() {
  static main = Layer.effect(
    APIConfig,
    Effect.gen(function* () {
      const endpoint = yield* Config.string("JOB_STORE_ENDPOINT");
      const apiKey = yield* Config.string("API_KEY");
      return { endpoint, apiKey };
    }),
  );
}
