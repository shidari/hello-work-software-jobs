import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "lib/**/__tests__/**/*.test.ts",
      "app/**/__tests__/**/*.test.ts",
      "lib/**/__coveratge_tests__/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/**/__tests__/**",
        "lib/**/__coveratge_tests__/**",
        "lib/hellowork/scripts/**",
        // Type-only modules
        "lib/error.ts",
        "lib/hellowork/page/detail.ts",
        "lib/hellowork/job-number-crawler/type.ts",
      ],
    },
  },
});
