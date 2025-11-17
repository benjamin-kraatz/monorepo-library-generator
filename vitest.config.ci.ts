import path from "path"
import { defineConfig } from "vitest/config"

/**
 * CI/CD Test Configuration
 *
 * Comprehensive testing for continuous integration:
 * - Runs ALL tests including slow NX generator tests
 * - Sequential execution to prevent NX graph conflicts
 * - Extended timeouts for generator workspace creation
 * - Optimized for GitHub Actions / CI pipelines
 *
 * Usage: pnpm test:ci
 */
export default defineConfig({
  plugins: [],
  test: {
    setupFiles: [path.join(__dirname, "setupTests.ts")],
    include: [
      "./test/**/*.test.ts",
      "./src/**/*.spec.ts" // Include generator tests
    ],
    globals: true,
    environment: "node", // Required for NX devkit
    testTimeout: 60000, // 60s for NX generator tests with graph construction
    // Run test files sequentially to prevent NX graph construction conflicts
    // Per https://vitest.dev/guide/improving-performance
    fileParallelism: false, // Run one file at a time (prevents NX conflicts)
    pool: "threads", // threads pool generally outperforms forks
  },
  resolve: {
    alias: {
      "@template/basic/test": path.join(__dirname, "test"),
      "@template/basic": path.join(__dirname, "src")
    }
  }
})
