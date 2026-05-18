import path from "node:path";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, "../../..", "packages/db");
  const migrations = await readD1Migrations(migrationsPath);
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
          },
        },
      }),
    ],
    test: {
      setupFiles: ["./test/d1/apply-migrations.ts"],
      // pool-workers は workerd 上で動くため node:inspector が無く v8 coverage は取れない。
      // istanbul プロバイダはコード変換時に instrument するため pool-workers でも動作する。
      coverage: {
        provider: "istanbul",
        include: ["src/**"],
      },
    },
  };
});
