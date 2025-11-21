/**
 * Infrastructure Generator for CLI (Effect Wrapper)
 *
 * Thin wrapper around the shared infrastructure generator core.
 * Uses Effect FileSystem via EffectFsAdapter.
 *
 * @module monorepo-library-generator/cli/generators/infra
 */

import { Console, Effect } from "effect"
import { generateInfraCore, type GeneratorResult } from "../../generators/core/infra-generator-core"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import type { PlatformType } from "../../utils/platform-utils"

/**
 * Infrastructure Generator Options
 */
export interface InfraGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly platform?: PlatformType
  readonly includeClientServer?: boolean
  readonly includeEdge?: boolean
}

/**
 * Generate an infrastructure library (CLI)
 *
 * Generates an infrastructure library following Effect-based architecture patterns.
 * Uses Effect-native FileSystem operations.
 *
 * @param options - Generator options
 * @returns Effect that succeeds with GeneratorResult or fails with platform errors
 */
export function generateInfra(options: InfraGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    yield* Console.log(`Creating infrastructure library: ${options.name}...`)

    // Import names from @nx/devkit for naming transformations
    const { names } = yield* Effect.promise(() => import("@nx/devkit"))
    const nameVariants = names(options.name)

    // Compute project identifiers
    const projectName = `infra-${nameVariants.fileName}`
    const projectRoot = `libs/infra/${nameVariants.fileName}`
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
      description: options.description || `${nameVariants.className} infrastructure library`,
      tags: options.tags ||
        `type:infra,scope:shared,platform:${options.platform || "node"}`,
      offsetFromRoot: "../../..",
      workspaceRoot,
      platform: options.platform || "node",
      ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
      ...(options.includeEdge !== undefined && { includeEdge: options.includeEdge })
    }

    const result: GeneratorResult = yield* (
      generateInfraCore(adapter, coreOptions) as Effect.Effect<GeneratorResult>
    )

    // CLI-specific output
    yield* Console.log("✨ Infrastructure library created successfully!")
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
