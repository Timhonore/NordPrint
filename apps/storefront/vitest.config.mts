import { defineConfig } from "vitest/config";

/**
 * Unit tests for the storefront.
 *
 * `e2e/` belongs to Playwright. Without this exclusion Vitest picks up the
 * spec files, fails on `@playwright/test`'s fixtures, and `pnpm test` goes
 * red for reasons that have nothing to do with the code.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    environment: "node",
  },
});
