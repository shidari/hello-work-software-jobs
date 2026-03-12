import { serve } from "@hono/node-server";
import { Effect } from "effect";
import { Hono } from "hono";
import { TriggerApp } from "../app/trigger";

const program = Effect.gen(function* () {
  const triggerApp = yield* TriggerApp;
  return triggerApp;
});

const runnable = program.pipe(Effect.provide(TriggerApp.Default));

const triggerApp = await Effect.runPromise(runnable);

const app = new Hono();
app.route("/", triggerApp);

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port });
console.log(`Collector running on port ${port}`);
