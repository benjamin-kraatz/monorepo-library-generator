/**
 * Platform Export Utilities
 *
 * Shared utilities for determining platform-specific export generation.
 * Consolidates logic for client/server/edge export determination across generators.
 *
 * @module monorepo-library-generator/platform-utils
 */

import type { LibraryType } from "./shared/types.js"

/**
 * Platform type for library
 */
export type PlatformType = "node" | "browser" | "universal" | "edge"

/**
 * Options for determining platform exports
 */
export interface PlatformExportOptions {
  readonly libraryType: LibraryType
  readonly platform: PlatformType
  readonly includeClientServer?: boolean
}

/**
 * Result of platform export determination
 */
export interface PlatformExports {
  readonly shouldGenerateServer: boolean
  readonly shouldGenerateClient: boolean
}

/**
 * Determine if platform-specific exports should be generated
 *
 * Implements the correct precedence logic:
 * 1. Explicit `includeClientServer` setting takes precedence
 * 2. Platform defaults apply if `includeClientServer` is undefined
 * 3. data-access and contract libraries never generate platform-specific exports
 *
 * @param options - Platform export options
 * @returns Object with shouldGenerateServer and shouldGenerateClient flags
 *
 * @example
 * ```typescript
 * // Explicit override - generate both regardless of platform
 * determinePlatformExports({
 *   libraryType: 'feature',
 *   platform: 'node',
 *   includeClientServer: true
 * });
 * // => { shouldGenerateServer: true, shouldGenerateClient: true }
 *
 * // Explicit override - generate neither
 * determinePlatformExports({
 *   libraryType: 'provider',
 *   platform: 'universal',
 *   includeClientServer: false
 * });
 * // => { shouldGenerateServer: false, shouldGenerateClient: false }
 *
 * // Platform defaults - universal generates both
 * determinePlatformExports({
 *   libraryType: 'infra',
 *   platform: 'universal',
 * });
 * // => { shouldGenerateServer: true, shouldGenerateClient: true }
 *
 * // Platform defaults - node only generates server
 * determinePlatformExports({
 *   libraryType: 'provider',
 *   platform: 'node',
 * });
 * // => { shouldGenerateServer: true, shouldGenerateClient: false }
 *
 * // Contract libraries never generate platform-specific exports
 * determinePlatformExports({
 *   libraryType: 'contract',
 *   platform: 'universal',
 *   includeClientServer: true
 * });
 * // => { shouldGenerateServer: false, shouldGenerateClient: false }
 * ```
 */
export function determinePlatformExports(
  options: PlatformExportOptions
): PlatformExports {
  // Library types that don't support platform-specific exports
  const supportsPlatformExports = options.libraryType !== "data-access" &&
    options.libraryType !== "contract"

  if (!supportsPlatformExports) {
    return { shouldGenerateServer: false, shouldGenerateClient: false }
  }

  // Explicit override: includeClientServer === true
  if (options.includeClientServer === true) {
    return { shouldGenerateServer: true, shouldGenerateClient: true }
  }

  // Explicit override: includeClientServer === false
  if (options.includeClientServer === false) {
    return { shouldGenerateServer: false, shouldGenerateClient: false }
  }

  // Platform defaults (includeClientServer is undefined)
  const shouldGenerateServer = options.platform === "node" || options.platform === "universal"
  const shouldGenerateClient = options.platform === "browser" || options.platform === "universal"

  return { shouldGenerateServer, shouldGenerateClient }
}

/**
 * Check if a library type supports platform-specific exports
 *
 * @param libraryType - Library type to check
 * @returns true if library type supports platform-specific exports
 *
 * @example
 * ```typescript
 * supportsPlatformExports('feature');     // => true
 * supportsPlatformExports('provider');    // => true
 * supportsPlatformExports('infra');       // => true
 * supportsPlatformExports('contract');    // => false
 * supportsPlatformExports('data-access'); // => false
 * ```
 */
export function supportsPlatformExports(libraryType: LibraryType): boolean {
  return libraryType !== "data-access" && libraryType !== "contract"
}
