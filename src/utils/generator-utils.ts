import type { Tree } from "@nx/devkit"
import type { LibraryType, PlatformType } from "./build-config-utils"

/**
 * Create standardized tags for library types
 */
export function createStandardTags(
  libraryType: LibraryType,
  platform: PlatformType = "universal"
) {
  return [`type:${libraryType}`, `platform:${platform}`]
}

/**
 * Parse tags from comma-separated string and merge with defaults
 */
export function parseTags(
  tagsInput: string | undefined,
  defaultTags: Array<string>
) {
  if (!tagsInput) {
    return defaultTags
  }

  const customTags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

  // Merge default tags with custom tags, removing duplicates
  return [...defaultTags, ...customTags]
}

/**
 * Validate that a library does not already exist
 */
export function validateLibraryDoesNotExist(
  tree: Tree,
  projectRoot: string,
  projectName: string
) {
  if (tree.exists(projectRoot)) {
    throw new Error(
      `Library "${projectName}" already exists at ${projectRoot}`
    )
  }
}
