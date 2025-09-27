import type { LaunchOptions } from "playwright";

export type HelloWorkScrapingConfig = {
  browserConfig: Pick<LaunchOptions, "headless" | "executablePath" | "args">;
  debugLog: boolean;
};

export async function defineHelloWorkScrapingConfig(
  config:
    | HelloWorkScrapingConfig
    | Promise<HelloWorkScrapingConfig>
    | (() => HelloWorkScrapingConfig | HelloWorkScrapingConfig)
    | (() => HelloWorkScrapingConfig | Promise<HelloWorkScrapingConfig>),
): Promise<HelloWorkScrapingConfig> {
  if (typeof config === "function") {
    return await config();
  }
  return await config;
}

export default defineHelloWorkScrapingConfig(async () => {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const chromium = isLambda
    ? await import("@sparticuz/chromium").then((mod) => mod.default)
    : null;
  return {
    browserConfig: {
      args: chromium ? chromium.args : [],
      executablePath: chromium ? await chromium.executablePath() : undefined,
      headless: false,
    },
    debugLog: false,
  };
});
