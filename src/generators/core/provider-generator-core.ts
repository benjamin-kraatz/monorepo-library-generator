/**
 * Provider Generator Core
 *
 * Generates domain-specific files for provider libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * Responsibilities:
 * - Generates service implementation for external service integration
 * - Creates types, validation, and error definitions
 * - Generates layer compositions for different environments
 * - Creates platform-specific exports (client, server, edge)
 * - Infrastructure generation is handled by wrapper generators
 *
 * @module monorepo-library-generator/generators/core/provider-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { computePlatformConfiguration, type PlatformType } from "../../utils/platform-utils"
import type { Platform, ProviderTemplateOptions } from "../../utils/shared/types"
import {
  generateClientFile,
  generateEdgeFile,
  generateErrorsFile,
  generateIndexFile,
  generateLayersFile,
  generateServerFile,
  generateServiceFile,
  generateServiceSpecFile,
  generateTypesFile,
  generateValidationFile
} from "../provider/templates/index"

/**
 * Provider Generator Core Options
 *
 * Receives pre-computed metadata from wrapper generators.
 * Wrappers are responsible for:
 * - Computing all paths via computeLibraryMetadata()
 * - Generating infrastructure files (package.json, tsconfig, project.json)
 * - Running this core function for domain file generation
 *
 * @property externalService - Name of external service being integrated
 * @property platform - Target platform (node, browser, edge, universal)
 */
export interface ProviderGeneratorCoreOptions {
  readonly name: string
  readonly className: string
  readonly propertyName: string
  readonly fileName: string
  readonly constantName: string
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly description: string
  readonly tags: string
  readonly offsetFromRoot: string
  readonly workspaceRoot?: string
  readonly externalService: string
  readonly platform: PlatformType
}

/**
 * Generator Result
 *
 * Metadata returned after successful generation.
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly filesGenerated: Array<string>
}

/**
 * Generate Provider Library Domain Files
 *
 * Generates only domain-specific files for provider libraries.
 * Infrastructure files (package.json, tsconfig, project.json) are handled by wrappers.
 *
 * This core function works with any FileSystemAdapter implementation,
 * allowing both Nx and CLI wrappers to share the same domain generation logic.
 *
 * @param adapter - FileSystemAdapter implementation (Nx Tree or Effect FileSystem)
 * @param options - Pre-computed metadata and feature flags from wrapper
 * @returns Effect that succeeds with GeneratorResult or fails with file system errors
 */
export function generateProviderCore(
  adapter: FileSystemAdapter,
  options: ProviderGeneratorCoreOptions
) {
  return Effect.gen(function*() {
    // Compute platform configuration
    const platformConfig = computePlatformConfiguration(
      {
        platform: options.platform
      },
      {
        defaultPlatform: "node",
        libraryType: "provider"
      }
    )

    const { includeClientServer, includeEdge } = platformConfig

    // Map PlatformType to Platform for template options (internal mapping)
    const platformMapping: Record<PlatformType, Platform> = {
      node: "server",
      browser: "client",
      edge: "edge",
      universal: "universal"
    }

    // Assemble template options from pre-computed metadata
    const templateOptions: ProviderTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "provider",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(","),
      externalService: options.externalService,
      platforms: [platformMapping[options.platform]]
    }

    // Generate all domain files
    const filesGenerated: Array<string> = []
    const sourceLibPath = `${options.sourceRoot}/lib`

    // Generate barrel exports
    yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions))
    filesGenerated.push(`${options.sourceRoot}/index.ts`)

    // Generate all provider-specific files
    yield* adapter.writeFile(`${sourceLibPath}/errors.ts`, generateErrorsFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/errors.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/types.ts`, generateTypesFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/types.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/validation.ts`, generateValidationFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/validation.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/service.ts`, generateServiceFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/service.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/layers.ts`, generateLayersFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/layers.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/service.spec.ts`, generateServiceSpecFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/service.spec.ts`)

    // Generate platform-specific export files
    // Server exports (always generated for Node.js providers)
    if (options.platform === "node" || options.platform === "universal") {
      const serverContent = generateServerFile(templateOptions)
      yield* adapter.writeFile(`${options.sourceRoot}/server.ts`, serverContent)
      filesGenerated.push(`${options.sourceRoot}/server.ts`)
    }

    // Client exports (conditional)
    if (includeClientServer || options.platform === "browser" || options.platform === "universal") {
      const clientContent = generateClientFile(templateOptions)
      yield* adapter.writeFile(`${options.sourceRoot}/client.ts`, clientContent)
      filesGenerated.push(`${options.sourceRoot}/client.ts`)
    }

    // Edge exports (conditional)
    if (includeEdge || options.platform === "edge") {
      const edgeContent = generateEdgeFile(templateOptions)
      yield* adapter.writeFile(`${options.sourceRoot}/edge.ts`, edgeContent)
      filesGenerated.push(`${options.sourceRoot}/edge.ts`)
    }

    return {
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      packageName: options.packageName,
      filesGenerated
    }
  })
}
