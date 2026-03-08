import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { TriggerApp } from "..";

describe("POST /trigger", () => {
  it("無効なAPIキーで 401 を返す", async () => {
    const app = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* TriggerApp;
      }).pipe(Effect.provide(TriggerApp.test)),
    );

    const res = await app.request("/trigger", {
      method: "POST",
      headers: { "x-api-key": "wrong-key" },
    });
    expect(res.status).toBe(401);
  });
});
