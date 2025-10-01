import type { JobSearchCriteria } from "@sho/models";
import type { LaunchOptions } from "playwright";
export default defineHelloWorkCrawlingConfig(async () => {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const chromium = isLambda
    ? await import("@sparticuz/chromium").then((mod) => mod.default)
    : null;
  return {
    roughMaxCount: 400,
    browserConfig: {
      executablePath: chromium ? await chromium.executablePath() : undefined,
      args: chromium ? chromium.args : [],
    },
    nextPageDelayMs: 3000,
    debugLog: false,
    jobSearchCriteria: {
      workLocation: { prefecture: "東京都" },
      desiredOccupation: {
        occupationSelection: "ソフトウェア開発技術者、プログラマー",
      },
      searchPeriod: "today",
    },
  };
});

export type HelloWorkCrawlingConfig = {
  roughMaxCount: number;
  browserConfig: Pick<LaunchOptions, "headless" | "executablePath" | "args">;
  debugLog: boolean;
  nextPageDelayMs: number;
  jobSearchCriteria: JobSearchCriteria;
};

async function defineHelloWorkCrawlingConfig(
  config:
    | HelloWorkCrawlingConfig
    | Promise<HelloWorkCrawlingConfig>
    | (() => HelloWorkCrawlingConfig)
    | (() => Promise<HelloWorkCrawlingConfig>),
): Promise<HelloWorkCrawlingConfig> {
  if (typeof config === "function") {
    return await config();
  }
  return await config;
}
