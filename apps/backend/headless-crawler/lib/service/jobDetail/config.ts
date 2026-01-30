
import { Effect } from "effect"
import { Chromium } from "../resource/chromium"
import { GetExecutablePathError } from "./error"

// Define a Cache service
export class ExtractorConfig extends Effect.Service<ExtractorConfig>()("jobDetail/config/extractor", {
    // Define how to create the service
    effect: Effect.gen(function* () {
        const chromium = yield* Chromium
        const executablePath = yield* Effect.tryPromise({
            try: () => chromium.executablePath(),
            catch: (error) =>
                new GetExecutablePathError({
                    message: `Failed to get chromium executable path: ${String(error)}`,
                }),
        })
        return {
            debugLog: false,
            browserConfig: {
                headless: false,
                args: chromium.args,
                executablePath
            },
        }
    }),
    dependencies: [Chromium.Default],
}) { }