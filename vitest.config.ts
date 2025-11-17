/**
 * Default Vitest Configuration
 *
 * This is a router config that defaults to local development settings.
 * The local config provides fast feedback by skipping slow generator tests.
 *
 * Available configurations:
 * - vitest.config.local.ts - Fast unit tests only (default)
 * - vitest.config.ci.ts - Full test suite for CI/CD
 *
 * Usage:
 * - pnpm test                  → Uses local config (fast)
 * - pnpm test:ci               → Uses CI config (comprehensive)
 * - pnpm test:generators       → Targeted generator testing
 */

// Export the local config as default for fast development
export { default } from './vitest.config.local.js'
