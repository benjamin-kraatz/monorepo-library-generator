/**
 * Feature Generator Core
 *
 * Generates domain-specific files for feature libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * Responsibilities:
 * - Generates service implementation and business logic files
 * - Creates RPC routers and handlers (optional)
 * - Generates client-side hooks and state management (optional)
 * - Creates edge middleware (optional)
 * - Supports CQRS structure with placeholders
 * - Infrastructure generation is handled by wrapper generators
 *
 * @module monorepo-library-generator/generators/core/feature-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { computePlatformConfiguration, type PlatformType } from "../../utils/platform-utils"
import type { FeatureTemplateOptions } from "../../utils/shared/types"
import {
  generateAtomsFile,
  generateAtomsIndexFile,
  generateErrorsFile,
  generateHooksFile,
  generateHooksIndexFile,
  generateIndexFile,
  generateLayersFile,
  generateMiddlewareFile,
  generateRpcErrorsFile,
  generateRpcFile,
  generateRpcHandlersFile,
  generateSchemasFile,
  generateServiceFile,
  generateServiceSpecFile,
  generateTypesFile
} from "../feature/templates/index"

/**
 * Feature Generator Core Options
 *
 * Receives pre-computed metadata from wrapper generators.
 * Wrappers are responsible for:
 * - Computing all paths via computeLibraryMetadata()
 * - Generating infrastructure files (package.json, tsconfig, project.json)
 * - Running this core function for domain file generation
 *
 * @property platform - Target platform (universal, node, browser, edge)
 * @property includeClientServer - Generate client-side hooks and state management
 * @property includeRPC - Generate RPC router and handlers
 * @property includeCQRS - Generate CQRS structure with placeholders
 * @property includeEdge - Generate edge middleware
 */
export interface FeatureGeneratorCoreOptions {
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
  readonly platform?: PlatformType
  readonly scope?: string
  readonly includeClientServer?: boolean
  readonly includeRPC?: boolean
  readonly includeCQRS?: boolean
  readonly includeEdge?: boolean
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
 * Generate Feature Library Domain Files
 *
 * Generates only domain-specific files for feature libraries.
 * Infrastructure files (package.json, tsconfig, project.json) are handled by wrappers.
 *
 * This core function works with any FileSystemAdapter implementation,
 * allowing both Nx and CLI wrappers to share the same domain generation logic.
 *
 * @param adapter - FileSystemAdapter implementation (Nx Tree or Effect FileSystem)
 * @param options - Pre-computed metadata and feature flags from wrapper
 * @returns Effect that succeeds with GeneratorResult or fails with file system errors
 */
export function generateFeatureCore(
  adapter: FileSystemAdapter,
  options: FeatureGeneratorCoreOptions
) {
  return Effect.gen(function*() {
    // Compute platform-specific configuration
    const includeRPC = options.includeRPC ?? false
    const includeCQRS = options.includeCQRS ?? false
    const includeEdge = options.includeEdge ?? false

    const platformConfig = computePlatformConfiguration(
      {
        ...(options.platform !== undefined && { platform: options.platform }),
        ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
        ...(includeEdge && { includeEdge })
      },
      {
        defaultPlatform: "universal",
        libraryType: "feature"
      }
    )

    const { includeClientServer: shouldIncludeClientServer, includeEdge: shouldIncludeEdge } = platformConfig

    // Assemble template options from pre-computed metadata
    const templateOptions: FeatureTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "feature",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(","),
      includeClient: shouldIncludeClientServer,
      includeServer: true,
      includeRPC,
      includeCQRS,
      includeEdge: shouldIncludeEdge
    }

    // Generate all domain files
    const filesGenerated: Array<string> = []

    // Compute directory paths
    const sourceLibPath = `${options.sourceRoot}/lib`
    const sharedPath = `${sourceLibPath}/shared`
    const serverPath = `${sourceLibPath}/server`
    const rpcPath = `${sourceLibPath}/rpc`
    const clientPath = `${sourceLibPath}/client`
    const edgePath = `${sourceLibPath}/edge`

    // Generate main index.ts (barrel exports)
    yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions))
    filesGenerated.push(`${options.sourceRoot}/index.ts`)

    // Always generate shared layer
    yield* adapter.writeFile(`${sharedPath}/errors.ts`, generateErrorsFile(templateOptions))
    filesGenerated.push(`${sharedPath}/errors.ts`)

    yield* adapter.writeFile(`${sharedPath}/types.ts`, generateTypesFile(templateOptions))
    filesGenerated.push(`${sharedPath}/types.ts`)

    yield* adapter.writeFile(`${sharedPath}/schemas.ts`, generateSchemasFile(templateOptions))
    filesGenerated.push(`${sharedPath}/schemas.ts`)

    // Generate server layer (always generated for features)
    yield* adapter.writeFile(`${serverPath}/service.ts`, generateServiceFile(templateOptions))
    filesGenerated.push(`${serverPath}/service.ts`)

    yield* adapter.writeFile(`${serverPath}/layers.ts`, generateLayersFile(templateOptions))
    filesGenerated.push(`${serverPath}/layers.ts`)

    yield* adapter.writeFile(`${serverPath}/service.spec.ts`, generateServiceSpecFile(templateOptions))
    filesGenerated.push(`${serverPath}/service.spec.ts`)

    // Create CQRS directory placeholders (conditional)
    if (includeCQRS) {
      yield* adapter.writeFile(`${serverPath}/commands/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/commands/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/queries/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/queries/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/operations/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/operations/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/projections/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/projections/.gitkeep`)
    }

    // Generate RPC layer (conditional)
    if (includeRPC) {
      yield* adapter.writeFile(`${rpcPath}/rpc.ts`, generateRpcFile(templateOptions))
      filesGenerated.push(`${rpcPath}/rpc.ts`)

      yield* adapter.writeFile(`${rpcPath}/handlers.ts`, generateRpcHandlersFile(templateOptions))
      filesGenerated.push(`${rpcPath}/handlers.ts`)

      yield* adapter.writeFile(`${rpcPath}/errors.ts`, generateRpcErrorsFile(templateOptions))
      filesGenerated.push(`${rpcPath}/errors.ts`)
    }

    // Generate client layer (conditional)
    if (shouldIncludeClientServer) {
      yield* adapter.writeFile(`${clientPath}/hooks/use-${options.fileName}.ts`, generateHooksFile(templateOptions))
      filesGenerated.push(`${clientPath}/hooks/use-${options.fileName}.ts`)

      yield* adapter.writeFile(`${clientPath}/hooks/index.ts`, generateHooksIndexFile(templateOptions))
      filesGenerated.push(`${clientPath}/hooks/index.ts`)

      yield* adapter.writeFile(`${clientPath}/atoms/${options.fileName}-atoms.ts`, generateAtomsFile(templateOptions))
      filesGenerated.push(`${clientPath}/atoms/${options.fileName}-atoms.ts`)

      yield* adapter.writeFile(`${clientPath}/atoms/index.ts`, generateAtomsIndexFile(templateOptions))
      filesGenerated.push(`${clientPath}/atoms/index.ts`)

      yield* adapter.writeFile(`${clientPath}/components/.gitkeep`, "")
      filesGenerated.push(`${clientPath}/components/.gitkeep`)
    }

    // Generate edge layer (conditional)
    if (shouldIncludeEdge) {
      yield* adapter.writeFile(`${edgePath}/middleware.ts`, generateMiddlewareFile(templateOptions))
      filesGenerated.push(`${edgePath}/middleware.ts`)
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
