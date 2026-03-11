import { Config, ConfigProvider, Data, Effect, Layer } from "effect";
import { createMiddleware } from "hono/factory";

export class InvalidApiKeyError extends Data.TaggedError("InvalidApiKeyError")<{
  readonly message: string;
}> {}

export class AuthMiddleware extends Effect.Service<AuthMiddleware>()(
  "AuthMiddleware",
  {
    effect: Effect.gen(function* () {
      const validApiKey = yield* Config.string("API_KEY");
      return {
        middleware: createMiddleware(async (c, next) => {
          const apiKey = c.req.header("x-api-key");
          if (!apiKey || apiKey !== validApiKey) {
            return c.json({ message: "Invalid API key" }, 401);
          }
          return next();
        }),
      };
    }),
  },
) {
  static test = AuthMiddleware.Default.pipe(
    Layer.provide(
      Layer.setConfigProvider(
        ConfigProvider.fromJson({ API_KEY: "test-secret-key" }),
      ),
    ),
  );
}
