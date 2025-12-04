/**
 * Feature Generator for CLI (Effect Wrapper)
 *
 * Thin wrapper around the shared feature generator core.
 * Uses Effect FileSystem via EffectFsAdapter.
 *
 * @module monorepo-library-generator/cli/generators/feature
 */

import { Console, Effect } from "effect"
import { generateFeatureCore, type GeneratorResult } from "../../generators/core/feature-generator-core"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { generateInfrastructureFiles } from "../../utils/infrastructure-generator"
import type { PlatformType } from "../../utils/platform-utils"

/**
 * Feature Generator Options
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
 * Generate a feature library (CLI)
 *
 * Generates a feature library following Effect-based architecture patterns.
 * Uses Effect-native FileSystem operations.
 *
 * @param options - Generator options
 * @returns Effect that succeeds with GeneratorResult or fails with platform errors
 */
export function generateFeature(options: FeatureGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    yield* Console.log(`Creating feature library: ${options.name}...`)

    // Import names from @nx/devkit for naming transformations
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

    // Generate infrastructure files
    yield* generateInfrastructureFiles(adapter, {
      workspaceRoot,
      projectRoot,
      projectName,
      packageName,
      description: options.description || `${nameVariants.className} feature library`,
      libraryType: "feature",
      offsetFromRoot: "../../.."
    })

    // Generate domain files via core generator
    const result: GeneratorResult = yield* (
      generateFeatureCore(adapter, coreOptions) as Effect.Effect<GeneratorResult>
    )

    // CLI-specific output
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
