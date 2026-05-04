import path from "node:path";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
export default defineWorkersConfig(async () => {
  const migrationsPath = path.join(__dirname, "../../..", "packages/db");
  const migrations = await readD1Migrations(migrationsPath);
  return {
    test: {
      setupFiles: ["./test/d1/apply-migrations.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
            },
          },
        },
      },
      // pool-workers は workerd 上で動くため node:inspector が無く v8 coverage は取れない。
      // istanbul プロバイダはコード変換時に instrument するため pool-workers でも動作する。
      coverage: {
        provider: "istanbul",
        include: ["src/**"],
      },
    },
  };
});
