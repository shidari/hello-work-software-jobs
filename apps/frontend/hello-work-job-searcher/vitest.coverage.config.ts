import path from "node:path";
import { defineConfig } from "vitest/config";

// Dedicated vitest config for the __coveratge_tests__ sweep.
// The main vitest.config.ts wires storybook + browser mode which is not
// suitable for pure-logic coverage of util / atom / dto modules.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: "coverage-sweep",
    environment: "node",
    include: ["src/**/__coveratge_tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/util.ts", "src/atom.ts", "src/dto.ts"],
    },
  },
});
