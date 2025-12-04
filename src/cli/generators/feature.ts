/**
 * Feature Generator for CLI (Effect Wrapper)
 *
 * Wrapper that integrates feature generator core with Effect-based CLI.
 *
 * Responsibilities:
 * - Computes library metadata for standalone use
 * - Generates infrastructure files via generateInfrastructureFiles()
 * - Delegates domain file generation to core generator
 * - Provides CLI-specific output and instructions
 *
 * @module monorepo-library-generator/cli/generators/feature
 */

import { Console, Effect } from "effect"
import { generateFeatureCore, type GeneratorResult } from "../../generators/core/feature-generator-core"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { generateInfrastructureFiles } from "../../utils/infrastructure-generator"
import type { PlatformType } from "../../utils/platform-utils"

/**
 * Feature Generator Options (CLI)
 */
export interface FeatureGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly scope?: string
  readonly platform?: PlatformType
  readonly includeClientServer?: boolean
  readonly includeRPC?: boolean
  readonly includeCQRS?: boolean
  readonly includeEdge?: boolean
}

/**
 * Generate Feature Library (CLI)
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * Uses Effect-native FileSystem operations for cross-platform compatibility.
 */
export function generateFeature(options: FeatureGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    yield* Console.log(`Creating feature library: ${options.name}...`)

    // Compute naming variants
    const { names } = yield* Effect.promise(() => import("@nx/devkit"))
    const nameVariants = names(options.name)

    // Compute project identifiers
    const projectName = `feature-${nameVariants.fileName}`
    const projectRoot = `libs/feature/${nameVariants.fileName}`
    const sourceRoot = `${projectRoot}/src`
    const packageName = `@custom-repo/${projectName}`

    // Prepare core options
    const coreOptions = {
      name: options.name,
      className: nameVariants.className,
      propertyName: nameVariants.propertyName,
      fileName: nameVariants.fileName,
      constantName: nameVariants.constantName,
      projectName,
      projectRoot,
      sourceRoot,
      packageName,
      description: options.description || `${nameVariants.className} feature library`,
      tags: options.tags ||
        `type:feature,scope:${options.scope || options.name},platform:${options.platform || "universal"}`,
      offsetFromRoot: "../../..",
      workspaceRoot,
      platform: options.platform || "universal",
      ...(options.scope !== undefined && { scope: options.scope }),
      ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
      ...(options.includeRPC !== undefined && { includeRPC: options.includeRPC }),
      ...(options.includeCQRS !== undefined && { includeCQRS: options.includeCQRS }),
      ...(options.includeEdge !== undefined && { includeEdge: options.includeEdge })
    }

    // Phase 1: Generate infrastructure files
    yield* generateInfrastructureFiles(adapter, {
      workspaceRoot,
      projectRoot,
      projectName,
      packageName,
      description: options.description || `${nameVariants.className} feature library`,
      libraryType: "feature",
      offsetFromRoot: "../../.."
    })

    // Phase 2: Generate domain files via core generator
    const result: GeneratorResult = yield* (
      generateFeatureCore(adapter, coreOptions) as Effect.Effect<GeneratorResult>
    )

    // Display CLI output
    yield* Console.log("✨ Feature library created successfully!")
    yield* Console.log(`  Location: ${result.projectRoot}`)
    yield* Console.log(`  Package: ${result.packageName}`)
    yield* Console.log(`  Files generated: ${result.filesGenerated.length}`)
    yield* Console.log(`\nNext steps:`)
    yield* Console.log(`  1. cd ${result.projectRoot}`)
    yield* Console.log(`  2. Customize service implementation`)
    yield* Console.log(`  3. pnpm install && pnpm build`)

    return result
  })
}
