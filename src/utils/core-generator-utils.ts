/**
 * Core Generator Utilities
 *
 * Shared utilities for all core generator implementations.
 * Provides common functions for path calculation, tag parsing, and metadata generation.
 *
 * @module monorepo-library-generator/core-generator-utils
 */

/**
 * Calculate relative path from project root to workspace root
 *
 * Computes how many "../" segments are needed to traverse from the project
 * directory back to the workspace root.
 *
 * @param projectRoot - Relative path from workspace root to project (e.g., "libs/contract/user")
 * @returns Relative path back to workspace root (e.g., "../../../")
 *
 * @example
 * ```typescript
 * calculateOffsetFromRoot("libs/contract/user")  // Returns: "../../../"
 * calculateOffsetFromRoot("apps/web")            // Returns: "../../"
 * calculateOffsetFromRoot("libs/shared")         // Returns: "../../"
 * ```
 */
export function calculateOffsetFromRoot(projectRoot: string): string {
  const depth = projectRoot.split("/").length
  return "../".repeat(depth)
}

/**
 * Parse tags from comma-separated string with defaults
 *
 * Merges user-provided tags with default tags, removing duplicates.
 * Tags can be provided as:
 * - Comma-separated string: "tag1,tag2,tag3"
 * - With whitespace: "tag1, tag2, tag3"
 * - undefined (uses only defaults)
 *
 * @param tags - Comma-separated tag string or undefined
 * @param defaults - Default tags to always include
 * @returns Merged array of unique tags
 *
 * @example
 * ```typescript
 * parseTags("custom:tag1,custom:tag2", ["type:library", "scope:shared"])
 * // Returns: ["type:library", "scope:shared", "custom:tag1", "custom:tag2"]
 *
 * parseTags(undefined, ["type:library"])
 * // Returns: ["type:library"]
 *
 * parseTags("type:library,scope:domain", ["type:library"])
 * // Returns: ["type:library", "scope:domain"] (deduplicates)
 * ```
 */
export function parseTags(
  tags: string | undefined,
  defaults: Array<string>
): Array<string> {
  if (!tags) return defaults

  const parsed = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  // Merge with defaults, removing duplicates
  return Array.from(new Set([...defaults, ...parsed]))
}
