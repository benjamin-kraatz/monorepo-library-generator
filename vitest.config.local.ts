import path from "path"
import { defineConfig } from "vitest/config"

/**
 * Local Development Test Configuration
 *
 * Optimized for fast feedback during development:
 * - Only runs unit tests in test directory
 * - Skips slow NX generator tests (spec files)
 * - Fast timeouts for quick iteration
 *
 * Usage: pnpm test
 */
export default defineConfig({
  plugins: [],
  test: {
    include: [
      "./test/**/*.test.ts" // Only unit tests, skip generator specs
    ],
    globals: true,
    environment: "node",
    testTimeout: 5000, // Fast timeout - these should be quick!
  },
  resolve: {
    alias: {
      "@template/basic/test": path.join(__dirname, "test"),
      "@template/basic": path.join(__dirname, "src")
    }
  }
})
