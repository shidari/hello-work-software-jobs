import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["functions/index.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"],
  noExternal: ["@sho/models", "@cloudflare/playwright", "effect", "date-fns", "linkedom"],
  external: [/^cloudflare:/],
  plugins: [
    {
      name: "stub-playwright-core",
      resolveId(id) {
        if (id === "playwright-core") return id;
      },
      load(id) {
        if (id === "playwright-core") return "export default {};";
      },
    },
  ],
  inlineOnly: false,
  target: "esnext",
  outputOptions: {
    codeSplitting: false,
  },
});
