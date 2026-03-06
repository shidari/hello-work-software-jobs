import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["functions/index.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"],
  noExternal: ["@sho/models", "@cloudflare/playwright", "effect", "date-fns", "linkedom"],
  external: ["playwright", /^node:/, /^cloudflare:/],
  inlineOnly: false,
  target: "esnext",
  outputOptions: {
    codeSplitting: false,
  },
});
