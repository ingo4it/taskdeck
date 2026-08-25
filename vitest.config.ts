import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  // component tests don't need Tailwind/PostCSS — disable config discovery so
  // the test run doesn't require the CSS toolchain
  css: { postcss: {} },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.{ts,tsx}", "components/**/*.tsx"],
      exclude: ["lib/env.ts", "**/*.d.ts"],
    },
  },
});
