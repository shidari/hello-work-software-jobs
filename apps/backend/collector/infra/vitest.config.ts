import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      include: ["bin/**", "lib/**", "functions/**", "sqs.ts"],
    },
  },
});
