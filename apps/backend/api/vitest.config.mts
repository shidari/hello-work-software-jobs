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
      coverage: {
        provider: "istanbul",
        reporter: ["text", "html"],
        include: ["src/**/*.ts"],
        exclude: ["src/**/types.ts"],
      },
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
    },
  };
});
